package com.pmd.auth.controller;

import com.pmd.auth.dto.ConfirmEmailResponse;
import com.pmd.auth.dto.ConfirmEmailStatus;
import com.pmd.auth.dto.LoginRequest;
import com.pmd.auth.dto.LoginResponse;
import com.pmd.auth.dto.PeoplePageWidgetsRequest;
import com.pmd.auth.dto.RegisterRequest;
import com.pmd.auth.dto.UpdateProfileRequest;
import com.pmd.auth.dto.UserResponse;
import com.pmd.auth.security.JwtService;
import com.pmd.auth.service.EmailVerificationTokenService;
import com.pmd.notification.WelcomeEmailService;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.PeoplePageWidgets;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
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

    private final UserService userService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final WelcomeEmailService welcomeEmailService;
    private final EmailVerificationTokenService emailVerificationTokenService;

    public AuthController(UserService userService, PasswordEncoder passwordEncoder, JwtService jwtService,
                          WelcomeEmailService welcomeEmailService,
                          EmailVerificationTokenService emailVerificationTokenService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.welcomeEmailService = welcomeEmailService;
        this.emailVerificationTokenService = emailVerificationTokenService;
    }

    @PostMapping("/login")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        User user;
        try {
            user = userService.findByUsername(request.getUsername());
        } catch (ResponseStatusException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        String token = generateToken(user);

        return new LoginResponse(token, toUserResponse(user));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.OK)
    public LoginResponse register(@Valid @RequestBody RegisterRequest request) {
        String username = request.getEmail();
        if (userService.existsByUsername(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "User already exist");
        }
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setTeamId(request.getTeamId());
        user.setTeam(request.getTeam());
        user.setBio(request.getBio());
        user.setDisplayName(buildDisplayName(user));

        User saved = userService.save(user);
        String confirmationToken = emailVerificationTokenService.createToken(saved).getToken();
        welcomeEmailService.sendWelcomeEmail(saved, confirmationToken);
        String jwtToken = generateToken(saved);
        return new LoginResponse(jwtToken, toUserResponse(saved));
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
            user.isEmailVerified(),
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
