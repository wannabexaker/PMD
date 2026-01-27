package com.pmd.auth.service;

import com.pmd.auth.dto.ConfirmEmailStatus;
import com.pmd.auth.model.EmailVerificationToken;
import com.pmd.auth.repository.EmailVerificationTokenRepository;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmailVerificationTokenService {

    private static final long EXPIRATION_SECONDS = 24 * 60 * 60;

    private final EmailVerificationTokenRepository tokenRepository;
    private final UserService userService;
    private final SecureRandom secureRandom = new SecureRandom();

    public EmailVerificationTokenService(EmailVerificationTokenRepository tokenRepository, UserService userService) {
        this.tokenRepository = tokenRepository;
        this.userService = userService;
    }

    public EmailVerificationToken createToken(User user) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUserId(user.getId());
        token.setToken(generateToken());
        token.setExpiresAt(Instant.now().plusSeconds(EXPIRATION_SECONDS));
        return tokenRepository.save(token);
    }

    public ConfirmEmailStatus confirmToken(String tokenValue) {
        if (tokenValue == null || tokenValue.isBlank()) {
            return ConfirmEmailStatus.INVALID_TOKEN;
        }

        EmailVerificationToken token = tokenRepository.findByToken(tokenValue).orElse(null);
        if (token == null) {
            return ConfirmEmailStatus.INVALID_TOKEN;
        }
        if (token.getExpiresAt() != null && token.getExpiresAt().isBefore(Instant.now())) {
            return ConfirmEmailStatus.EXPIRED_TOKEN;
        }

        User user;
        try {
            user = userService.findById(token.getUserId());
        } catch (ResponseStatusException ex) {
            return ConfirmEmailStatus.INVALID_TOKEN;
        }

        if (user.isEmailVerified()) {
            return ConfirmEmailStatus.ALREADY_CONFIRMED;
        }

        user.setEmailVerified(true);
        userService.save(user);

        token.setUsedAt(Instant.now());
        tokenRepository.save(token);
        return ConfirmEmailStatus.CONFIRMED;
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
