package com.pmd.auth.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.auth.dto.ConfirmEmailStatus;
import com.pmd.auth.model.EmailVerificationToken;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Email changes must never touch the login identity until the new address is proven, so a typo
 * cannot lock an account out. These pin that: the switch is applied only on confirmation, the
 * old email keeps working until then, and a consumed token cannot verify anything again.
 */
@SpringBootTest
class EmailChangeVerificationTest {

    @Autowired
    private EmailVerificationTokenService tokenService;

    @Autowired
    private UserRepository userRepository;

    private User savedUser(String email, boolean verified) {
        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setDisplayName(email);
        user.setEmailVerified(verified);
        return userRepository.save(user);
    }

    @Test
    void emailChangeIsAppliedOnlyWhenConfirmed() {
        String oldEmail = "old-" + System.nanoTime() + "@pmd.local";
        String newEmail = "new-" + System.nanoTime() + "@pmd.local";
        User user = savedUser(oldEmail, true);

        // Request the change: pending only, login identity untouched (what updateProfile does).
        user.setPendingEmail(newEmail);
        userRepository.save(user);
        EmailVerificationToken token = tokenService.createToken(user, newEmail);

        // Before confirmation the account still logs in with the old email.
        User before = userRepository.findById(user.getId()).orElseThrow();
        assertThat(before.getUsername()).isEqualTo(oldEmail);
        assertThat(before.getEmail()).isEqualTo(oldEmail);
        assertThat(before.getPendingEmail()).isEqualTo(newEmail);

        assertThat(tokenService.confirmTokenWithUser(token.getToken()).status())
            .isEqualTo(ConfirmEmailStatus.CONFIRMED);

        // Now — and only now — the login identity moves to the new address.
        User after = userRepository.findById(user.getId()).orElseThrow();
        assertThat(after.getUsername()).isEqualTo(newEmail);
        assertThat(after.getEmail()).isEqualTo(newEmail);
        assertThat(after.getPendingEmail()).isNull();
        assertThat(after.isEmailVerified()).isTrue();

        // The token is single-use: replaying it must not re-verify anything.
        assertThat(tokenService.confirmTokenWithUser(token.getToken()).status())
            .isEqualTo(ConfirmEmailStatus.INVALID_TOKEN);
    }

    @Test
    void registrationConfirmationStillVerifiesTheCurrentEmail() {
        String email = "reg-" + System.nanoTime() + "@pmd.local";
        User user = savedUser(email, false);
        EmailVerificationToken token = tokenService.createToken(user); // target = current email

        assertThat(tokenService.confirmTokenWithUser(token.getToken()).status())
            .isEqualTo(ConfirmEmailStatus.CONFIRMED);
        assertThat(userRepository.findById(user.getId()).orElseThrow().isEmailVerified()).isTrue();
    }
}
