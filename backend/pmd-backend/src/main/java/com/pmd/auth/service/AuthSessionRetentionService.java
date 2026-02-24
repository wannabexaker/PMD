package com.pmd.auth.service;

import com.pmd.auth.repository.AuthSecurityEventRepository;
import com.pmd.auth.repository.AuthSessionRepository;
import com.pmd.config.AuthSessionProperties;
import java.time.Instant;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class AuthSessionRetentionService {

    private static final long AUTH_SECURITY_EVENT_RETENTION_SECONDS = 180L * 24 * 60 * 60;

    private final AuthSessionRepository authSessionRepository;
    private final AuthSecurityEventRepository authSecurityEventRepository;
    private final AuthSessionProperties properties;

    public AuthSessionRetentionService(
        AuthSessionRepository authSessionRepository,
        AuthSecurityEventRepository authSecurityEventRepository,
        AuthSessionProperties properties
    ) {
        this.authSessionRepository = authSessionRepository;
        this.authSecurityEventRepository = authSecurityEventRepository;
        this.properties = properties;
    }

    @Scheduled(cron = "0 17 * * * *")
    public void cleanupAuthData() {
        Instant now = Instant.now();
        authSessionRepository.deleteByExpiresAtBefore(now.minusSeconds(60));
        authSessionRepository.deleteByRevokedAtBeforeAndRevokedAtIsNotNull(
            now.minusSeconds(properties.getRevokedRetentionSeconds())
        );
        authSecurityEventRepository.deleteByCreatedAtBefore(now.minusSeconds(AUTH_SECURITY_EVENT_RETENTION_SECONDS));
    }
}
