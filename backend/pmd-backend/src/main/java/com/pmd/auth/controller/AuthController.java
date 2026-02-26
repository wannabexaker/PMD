package com.pmd.auth.controller;

import com.pmd.auth.dto.ConfirmEmailResponse;
import com.pmd.auth.dto.ConfirmEmailStatus;
import com.pmd.auth.dto.LoginRequest;
import com.pmd.auth.dto.LoginResponse;
import com.pmd.auth.dto.PeoplePageWidgetsRequest;
import com.pmd.auth.dto.RegisterRequest;
import com.pmd.auth.dto.RegisterResponse;
import com.pmd.auth.dto.UpdateProfileRequest;
import com.pmd.auth.dto.UserResponse;
import com.pmd.auth.security.JwtService;
import com.pmd.auth.service.EmailVerificationTokenService;
import com.pmd.auth.service.AuthSessionService;
import com.pmd.auth.service.LoginRateLimiterService;
import com.pmd.auth.service.PasswordPolicyService;
import com.pmd.auth.service.AuthSecurityEventService;
import com.pmd.notification.WelcomeEmailService;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.auth.model.AuthSession;
import com.pmd.security.ClientMetadataService;
import com.pmd.user.model.PeoplePageWidgets;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final WelcomeEmailService welcomeEmailService;
    private final EmailVerificationTokenService emailVerificationTokenService;
    private final AuthSessionService authSessionService;
    private final LoginRateLimiterService loginRateLimiterService;
    private final PasswordPolicyService passwordPolicyService;
    private final AuthSecurityEventService authSecurityEventService;
    private final WorkspaceService workspaceService;
    private final ClientMetadataService clientMetadataService;

    public AuthController(UserService userService, PasswordEncoder passwordEncoder, JwtService jwtService,
                          WelcomeEmailService welcomeEmailService,
                          EmailVerificationTokenService emailVerificationTokenService,
                          AuthSessionService authSessionService,
                          LoginRateLimiterService loginRateLimiterService,
                          PasswordPolicyService passwordPolicyService,
                          AuthSecurityEventService authSecurityEventService,
                          WorkspaceService workspaceService,
                          ClientMetadataService clientMetadataService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.welcomeEmailService = welcomeEmailService;
        this.emailVerificationTokenService = emailVerificationTokenService;
        this.authSessionService = authSessionService;
        this.loginRateLimiterService = loginRateLimiterService;
        this.passwordPolicyService = passwordPolicyService;
        this.authSecurityEventService = authSecurityEventService;
        this.workspaceService = workspaceService;
        this.clientMetadataService = clientMetadataService;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String clientIp = clientMetadataService.resolveClientIp(httpRequest);
        String username = normalizeEmail(request.getUsername());
        loginRateLimiterService.checkAllowed(clientIp, username);
        User user;
        try {
            user = userService.findByUsername(username);
        } catch (ResponseStatusException ex) {
            loginRateLimiterService.recordFailure(clientIp, username);
            authSecurityEventService.log("LOGIN", "DENY", null, username, "Unknown username", httpRequest);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            loginRateLimiterService.recordFailure(clientIp, username);
            authSecurityEventService.log("LOGIN", "DENY", user.getId(), username, "Invalid password", httpRequest);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (authSessionService.requiresVerifiedEmail() && !user.isEmailVerified()) {
            authSecurityEventService.log("LOGIN", "DENY", user.getId(), username, "Email not verified", httpRequest);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Email verification required");
        }
        loginRateLimiterService.recordSuccess(clientIp, username);
        String token = generateToken(user);
        AuthSessionService.IssuedSession issuedSession = authSessionService.createSession(user, request.isRemember(), httpRequest);
        String csrfToken = authSessionService.generateCsrfToken();
        httpResponse.addHeader("Set-Cookie", authSessionService.buildRefreshCookie(issuedSession, httpRequest.isSecure()));
        httpResponse.addHeader("Set-Cookie", authSessionService.buildCsrfCookie(csrfToken, httpRequest.isSecure()));
        authSecurityEventService.log("LOGIN", "ALLOW", user.getId(), username, "Login success", httpRequest);

        return new LoginResponse(token, toUserResponse(user));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.OK)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        String username = normalizeEmail(request.getEmail());
        if (userService.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }
        passwordPolicyService.validateForRegister(request.getPassword());

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(username);
        user.setFirstName(request.getFirstName() != null ? request.getFirstName().trim() : null);
        user.setLastName(request.getLastName() != null ? request.getLastName().trim() : null);
        user.setTeamId(request.getTeamId());
        user.setTeam(request.getTeam());
        user.setBio(request.getBio() != null ? request.getBio().trim() : null);
        user.setDisplayName(buildDisplayName(user));

        User saved;
        try {
            saved = userService.save(user);
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exists");
        }
        String confirmationToken = emailVerificationTokenService.createToken(saved).getToken();
        boolean emailSent = welcomeEmailService.sendWelcomeEmail(saved, confirmationToken);
        try {
            workspaceService.getOrCreateDemoWorkspace(saved);
        } catch (Exception ex) {
            logger.warn("Failed to provision demo workspace for user {}", saved.getId(), ex);
        }
        String message = emailSent
            ? "Account created. Check your email to confirm."
            : "Account created, but verification email could not be sent. Please retry later.";
        return new RegisterResponse(true, emailSent, message);
    }

    @PostMapping("/refresh")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse refresh(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawToken = authSessionService.extractRawRefreshToken(httpRequest);
        if (rawToken == null || rawToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "No session");
        }
        AuthSession session = authSessionService.findActiveSessionByRawToken(rawToken)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired"));
        User user = userService.findById(session.getUserId());
        AuthSessionService.IssuedSession issuedSession = authSessionService.rotateSession(session, httpRequest);
        String csrfToken = authSessionService.generateCsrfToken();
        httpResponse.addHeader("Set-Cookie", authSessionService.buildRefreshCookie(issuedSession, httpRequest.isSecure()));
        httpResponse.addHeader("Set-Cookie", authSessionService.buildCsrfCookie(csrfToken, httpRequest.isSecure()));
        String token = generateToken(user);
        authSecurityEventService.log("REFRESH", "ALLOW", user.getId(), user.getUsername(), "Token refreshed", httpRequest);
        return new LoginResponse(token, toUserResponse(user));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String rawToken = authSessionService.extractRawRefreshToken(httpRequest);
        if (rawToken != null && !rawToken.isBlank()) {
            authSessionService.revokeByRawToken(rawToken);
        }
        httpResponse.addHeader("Set-Cookie", authSessionService.buildClearRefreshCookie(httpRequest.isSecure()));
        httpResponse.addHeader("Set-Cookie", authSessionService.buildClearCsrfCookie(httpRequest.isSecure()));
        authSecurityEventService.log("LOGOUT", "ALLOW", null, null, "Session logout", httpRequest);
    }

    @PostMapping("/logout-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logoutAll(Authentication authentication, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        authSessionService.revokeAllByUserId(principal.getId());
        httpResponse.addHeader("Set-Cookie", authSessionService.buildClearRefreshCookie(httpRequest.isSecure()));
        httpResponse.addHeader("Set-Cookie", authSessionService.buildClearCsrfCookie(httpRequest.isSecure()));
        authSecurityEventService.log("LOGOUT_ALL", "ALLOW", principal.getId(), principal.getUsername(), "All sessions revoked", httpRequest);
    }

    @GetMapping("/me")
    public UserResponse me(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = userService.findById(principal.getId());
        return toUserResponse(user);
    }

    @PutMapping("/me")
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest request,
                                      Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        User user = userService.findById(principal.getId());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setEmail(request.getEmail());
        if (request.getTeamId() != null || request.getTeam() != null) {
            user.setTeamId(request.getTeamId());
            user.setTeam(request.getTeam());
        }
        user.setBio(request.getBio());
        if (request.getAvatarUrl() != null) {
            user.setAvatarUrl(request.getAvatarUrl().trim());
        }
        user.setDisplayName(buildDisplayName(user));

        User saved = userService.save(user);
        return toUserResponse(saved);
    }

    @PatchMapping("/me/people-page-widgets")
    public PeoplePageWidgets updatePeoplePageWidgets(@RequestBody PeoplePageWidgetsRequest request,
                                                     Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = userService.findById(principal.getId());
        PeoplePageWidgets next = new PeoplePageWidgets(
            request.getVisible(),
            request.getOrder(),
            request.getConfig()
        ).mergeWithDefaults();
        user.setPeoplePageWidgets(next);
        User saved = userService.save(user);
        return saved.getPeoplePageWidgets();
    }

    private String generateToken(User user) {
        return jwtService.generateToken(
            user.getId(),
            Map.of(
                "username", user.getUsername(),
                "displayName", user.getDisplayName()
            )
        );
    }

    private UserResponse toUserResponse(User user) {
        PeoplePageWidgets widgets = user.getPeoplePageWidgets() != null
            ? user.getPeoplePageWidgets().mergeWithDefaults()
            : PeoplePageWidgets.defaults();
        return new UserResponse(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getTeam(),
            user.getTeamId(),
            user.getTeam(),
            user.isAdmin(),
            user.getBio(),
            user.getAvatarUrl(),
            user.isEmailVerified(),
            user.isMustChangePassword(),
            widgets
        );
    }

    private String buildDisplayName(User user) {
        String first = user.getFirstName();
        String last = user.getLastName();
        if (first != null && !first.isBlank() && last != null && !last.isBlank()) {
            return first.trim() + " " + last.trim();
        }
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (last != null && !last.isBlank()) {
            return last.trim();
        }
        return user.getUsername();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase();
    }

    @GetMapping("/confirm")
    @ResponseStatus(HttpStatus.OK)
    public ConfirmEmailResponse confirmEmail(@RequestParam("token") String token) {
        EmailVerificationTokenService.ConfirmEmailResult result = emailVerificationTokenService.confirmTokenWithUser(token);
        if (result.status() == ConfirmEmailStatus.CONFIRMED && result.user() != null) {
            welcomeEmailService.sendConfirmedEmail(result.user());
        }
        return new ConfirmEmailResponse(result.status());
    }
}
