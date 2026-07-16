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

    /** Registration: proves ownership of the account's current email. */
    public EmailVerificationToken createToken(User user) {
        return createToken(user, user.getEmail());
    }

    /** Binds the token to a specific address — the current email at registration, or a
     *  pending new email when the user changes it. */
    public EmailVerificationToken createToken(User user, String targetEmail) {
        EmailVerificationToken token = new EmailVerificationToken();
        token.setUserId(user.getId());
        token.setToken(generateToken());
        token.setTargetEmail(targetEmail);
        token.setExpiresAt(Instant.now().plusSeconds(EXPIRATION_SECONDS));
        return tokenRepository.save(token);
    }

    public ConfirmEmailStatus confirmToken(String tokenValue) {
        return confirmTokenWithUser(tokenValue).status();
    }

    public ConfirmEmailResult confirmTokenWithUser(String tokenValue) {
        if (tokenValue == null || tokenValue.isBlank()) {
            return new ConfirmEmailResult(ConfirmEmailStatus.INVALID_TOKEN, null);
        }

        EmailVerificationToken token = tokenRepository.findByToken(tokenValue).orElse(null);
        if (token == null) {
            return new ConfirmEmailResult(ConfirmEmailStatus.INVALID_TOKEN, null);
        }
        if (token.getExpiresAt() != null && token.getExpiresAt().isBefore(Instant.now())) {
            return new ConfirmEmailResult(ConfirmEmailStatus.EXPIRED_TOKEN, null);
        }

        // A consumed token must not verify anything again — otherwise an old registration link
        // could later confirm a different address the user never re-proved.
        if (token.getUsedAt() != null) {
            return new ConfirmEmailResult(ConfirmEmailStatus.INVALID_TOKEN, null);
        }

        User user;
        try {
            user = userService.findById(token.getUserId());
        } catch (ResponseStatusException ex) {
            return new ConfirmEmailResult(ConfirmEmailStatus.INVALID_TOKEN, null);
        }

        // Legacy tokens predate targetEmail; treat them as proving the current email.
        String target = token.getTargetEmail() != null ? token.getTargetEmail() : user.getEmail();

        // Email-change confirmation: apply the pending switch only now, so an unproven (or
        // mistyped) address never becomes the login identity. Checked before the
        // already-verified guard, since the user's OLD email is already verified.
        String pending = user.getPendingEmail();
        if (pending != null && !pending.isBlank() && pending.equalsIgnoreCase(target)) {
            User collision = userService.findByUsernameOrNull(pending);
            if (collision != null && !collision.getId().equals(user.getId())) {
                // Someone else claimed the address between request and confirmation.
                return new ConfirmEmailResult(ConfirmEmailStatus.INVALID_TOKEN, user);
            }
            user.setEmail(pending);
            user.setUsername(pending);
            user.setPendingEmail(null);
            user.setEmailVerified(true);
            userService.save(user);
            token.setUsedAt(Instant.now());
            tokenRepository.save(token);
            return new ConfirmEmailResult(ConfirmEmailStatus.CONFIRMED, user);
        }

        if (user.isEmailVerified()) {
            return new ConfirmEmailResult(ConfirmEmailStatus.ALREADY_CONFIRMED, user);
        }

        user.setEmailVerified(true);
        userService.save(user);

        token.setUsedAt(Instant.now());
        tokenRepository.save(token);
        return new ConfirmEmailResult(ConfirmEmailStatus.CONFIRMED, user);
    }

    public record ConfirmEmailResult(ConfirmEmailStatus status, User user) {}

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
