package com.pmd.auth.controller;

import com.pmd.auth.dto.ConfirmEmailResponse;
import com.pmd.auth.dto.ConfirmEmailStatus;
import com.pmd.auth.dto.LoginRequest;
import com.pmd.auth.dto.LoginResponse;
import com.pmd.auth.dto.GoogleLoginRequest;
import com.pmd.auth.dto.PeoplePageWidgetsRequest;
import com.pmd.auth.dto.RegisterRequest;
import com.pmd.auth.dto.RegisterResponse;
import com.pmd.auth.dto.UpdateProfileRequest;
import com.pmd.auth.dto.UserResponse;
import com.pmd.auth.security.JwtService;
import com.pmd.auth.security.GoogleTokenVerifier;
import com.pmd.auth.security.TurnstileService;
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
import com.pmd.privacy.service.AccountPrivacyService;
import com.pmd.upload.service.AvatarCleanupService;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.DeleteMapping;
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
    private final GoogleTokenVerifier googleTokenVerifier;
    private final TurnstileService turnstileService;
    private final AccountPrivacyService accountPrivacyService;
    private final AvatarCleanupService avatarCleanupService;

    public AuthController(UserService userService, PasswordEncoder passwordEncoder, JwtService jwtService,
                          WelcomeEmailService welcomeEmailService,
                          EmailVerificationTokenService emailVerificationTokenService,
                          AuthSessionService authSessionService,
                          LoginRateLimiterService loginRateLimiterService,
                          PasswordPolicyService passwordPolicyService,
                          AuthSecurityEventService authSecurityEventService,
                          WorkspaceService workspaceService,
                          ClientMetadataService clientMetadataService,
                          GoogleTokenVerifier googleTokenVerifier,
                          TurnstileService turnstileService,
                          AccountPrivacyService accountPrivacyService,
                          AvatarCleanupService avatarCleanupService) {
        this.avatarCleanupService = avatarCleanupService;
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
        this.googleTokenVerifier = googleTokenVerifier;
        this.turnstileService = turnstileService;
        this.accountPrivacyService = accountPrivacyService;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String clientIp = clientMetadataService.resolveClientIp(httpRequest);
        String username = normalizeEmail(request.getUsername());
        loginRateLimiterService.checkAllowed(clientIp, username);
        turnstileService.verifyOrThrow(request.getTurnstileToken(), clientIp);
        User user;
        try {
            user = userService.findByUsername(username);
        } catch (ResponseStatusException ex) {
            loginRateLimiterService.recordFailure(clientIp, username);
            authSecurityEventService.log("LOGIN", "DENY", null, username, "Unknown username", httpRequest);
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            loginRateLimiterService.recordFailure(clientIp, username);
            authSecurityEventService.log("LOGIN", "DENY", user.getId(), username, "Password login unavailable (Google account)", httpRequest);
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
        authSecurityEventService.log("LOGIN", "ALLOW", user.getId(), username, "Login success", httpRequest);
        return issueSession(user, request.isRemember(), httpRequest, httpResponse);
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.OK)
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        turnstileService.verifyOrThrow(request.getTurnstileToken(), clientMetadataService.resolveClientIp(httpRequest));
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

    @PostMapping("/google")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse google(@Valid @RequestBody GoogleLoginRequest request,
                                HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        // No Turnstile here: obtaining a valid Google ID token already requires a
        // real Google account and Google's own bot defenses.
        GoogleTokenVerifier.GoogleUser googleUser = googleTokenVerifier.verify(request.getCredential());
        String email = normalizeEmail(googleUser.email());

        User user = userService.findByUsernameOrNull(email);
        boolean newUser = false;
        if (user == null) {
            User created = new User();
            created.setUsername(email);
            created.setEmail(email);
            created.setFirstName(googleUser.firstName());
            created.setLastName(googleUser.lastName());
            created.setGoogleId(googleUser.subject());
            // Google has already verified ownership of this email address.
            created.setEmailVerified(true);
            created.setDisplayName(googleUser.name() != null && !googleUser.name().isBlank()
                ? googleUser.name().trim() : buildDisplayName(created));
            try {
                user = userService.save(created);
                newUser = true;
            } catch (DuplicateKeyException ex) {
                // Concurrent creation with the same email — reuse the existing row.
                user = userService.findByUsername(email);
            }
        } else {
            // Link Google to a pre-existing (e.g. password) account with the same verified email.
            boolean changed = false;
            if (user.getGoogleId() == null || user.getGoogleId().isBlank()) {
                user.setGoogleId(googleUser.subject());
                changed = true;
            }
            if (!user.isEmailVerified()) {
                // Google has now proven ownership of this email. Where verified email is the
                // security boundary for password login, a password previously set on this
                // still-unverified account is untrusted (it may have been planted by someone
                // who pre-registered the email), so invalidate it before flipping the account
                // to verified — only the Google owner keeps access. A new password can be set
                // later via reset. When verification is not enforced we leave the password as-is.
                if (authSessionService.requiresVerifiedEmail()
                        && user.getPasswordHash() != null && !user.getPasswordHash().isBlank()) {
                    user.setPasswordHash(null);
                    authSecurityEventService.log("GOOGLE_LINK", "ALLOW", user.getId(), email,
                        "Cleared unverified password while linking Google account", httpRequest);
                }
                user.setEmailVerified(true);
                changed = true;
            }
            if (changed) {
                user = userService.save(user);
            }
        }

        if (newUser) {
            try {
                workspaceService.getOrCreateDemoWorkspace(user);
            } catch (Exception ex) {
                logger.warn("Failed to provision demo workspace for Google user {}", user.getId(), ex);
            }
        }
        authSecurityEventService.log("LOGIN_GOOGLE", "ALLOW", user.getId(), email, "Google login success", httpRequest);
        return issueSession(user, request.isRemember(), httpRequest, httpResponse);
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
        String newEmail = normalizeEmail(request.getEmail());
        if (!newEmail.isBlank() && !newEmail.equals(normalizeEmail(user.getEmail()))) {
            // Changing the contact email: reject collisions with another account's login identity and
            // require the new address to be re-verified before it counts as confirmed.
            User emailOwner = userService.findByUsernameOrNull(newEmail);
            if (emailOwner != null && !emailOwner.getId().equals(user.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already in use");
            }
            user.setEmail(newEmail);
            user.setEmailVerified(false);
        }
        if (request.getTeamId() != null || request.getTeam() != null) {
            user.setTeamId(request.getTeamId());
            user.setTeam(request.getTeam());
        }
        user.setBio(request.getBio());
        String previousAvatar = user.getAvatarUrl();
        if (request.getAvatarUrl() != null) {
            String avatar = request.getAvatarUrl().trim();
            // Only allow an uploaded/relative path or an http(s) URL — never a
            // dangerous scheme such as javascript: or data:.
            if (!avatar.isEmpty() && !avatar.startsWith("/")
                && !avatar.startsWith("http://") && !avatar.startsWith("https://")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid avatar URL");
            }
            user.setAvatarUrl(avatar);
        }
        user.setDisplayName(buildDisplayName(user));

        User saved = userService.save(user);
        // /uploads is public, so a replaced photo would otherwise stay downloadable forever.
        // Only after the save: the reference check reads the database.
        if (previousAvatar != null && !previousAvatar.equals(saved.getAvatarUrl())) {
            avatarCleanupService.deleteIfUnreferenced(previousAvatar, "avatar replaced");
        }
        return toUserResponse(saved);
    }

    /** GDPR Art. 20: the user's own data, as a downloadable file. */
    @GetMapping("/me/export")
    public ResponseEntity<Map<String, Object>> exportMyData(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = userService.findById(principal.getId());
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"pmd-my-data.json\"")
            .body(accountPrivacyService.exportUserData(user));
    }

    /** GDPR Art. 17: erase the account. */
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyAccount(Authentication authentication,
                                HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        User user = userService.findById(principal.getId());
        List<String> blocking = accountPrivacyService.findWorkspacesBlockingDeletion(user);
        if (!blocking.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "You are the only member who can manage: " + String.join(", ", blocking)
                    + ". Hand them over to someone else, or delete them, before deleting your account.");
        }
        accountPrivacyService.deleteAccount(user);
        // Logged only after erasure, and without the email: keeps an accountability record of
        // the deletion without re-creating the personal data we were asked to remove.
        authSecurityEventService.log("ACCOUNT_DELETE", "ALLOW", user.getId(), null,
            "Account erased on user request", httpRequest);
        httpResponse.addHeader("Set-Cookie", authSessionService.buildClearRefreshCookie(httpRequest.isSecure()));
        httpResponse.addHeader("Set-Cookie", authSessionService.buildClearCsrfCookie(httpRequest.isSecure()));
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

    private LoginResponse issueSession(User user, boolean remember,
                                       HttpServletRequest httpRequest, HttpServletResponse httpResponse) {
        String token = generateToken(user);
        AuthSessionService.IssuedSession issuedSession = authSessionService.createSession(user, remember, httpRequest);
        String csrfToken = authSessionService.generateCsrfToken();
        httpResponse.addHeader("Set-Cookie", authSessionService.buildRefreshCookie(issuedSession, httpRequest.isSecure()));
        httpResponse.addHeader("Set-Cookie", authSessionService.buildCsrfCookie(csrfToken, httpRequest.isSecure()));
        return new LoginResponse(token, toUserResponse(user));
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
