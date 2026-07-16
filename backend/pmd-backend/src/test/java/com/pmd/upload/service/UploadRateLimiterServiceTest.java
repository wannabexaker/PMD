package com.pmd.upload.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

/**
 * The upload endpoint is otherwise open to any logged-in account, and unreferenced files are
 * not cleaned up, so this cap is what stops a scripted client from filling the disk. Plain unit
 * test — no Spring context needed.
 */
class UploadRateLimiterServiceTest {

    @Test
    void allowsUpToTheHourlyCeilingThenRejects() {
        UploadRateLimiterService limiter = new UploadRateLimiterService(3);
        String user = "user-a";

        for (int i = 0; i < 3; i++) {
            final int attempt = i;
            assertThatCode(() -> limiter.checkAndRecord(user))
                .as("upload %d of 3 should be allowed", attempt + 1)
                .doesNotThrowAnyException();
        }
        assertThatThrownBy(() -> limiter.checkAndRecord(user))
            .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void countsEachAccountSeparately() {
        UploadRateLimiterService limiter = new UploadRateLimiterService(1);
        limiter.checkAndRecord("user-a");
        // A different account is unaffected by user-a exhausting its allowance.
        assertThatCode(() -> limiter.checkAndRecord("user-b")).doesNotThrowAnyException();
        assertThatThrownBy(() -> limiter.checkAndRecord("user-a"))
            .isInstanceOf(ResponseStatusException.class);
    }
}
