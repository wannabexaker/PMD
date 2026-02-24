package com.pmd.auth.service;

import com.pmd.auth.model.AuthSession;
import com.pmd.auth.repository.AuthSessionRepository;
import com.pmd.config.AuthSessionProperties;
import com.pmd.user.model.User;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class AuthSessionService {

    public record IssuedSession(String rawToken, Instant expiresAt, boolean persistent) {
    }

    private final AuthSessionRepository authSessionRepository;
    private final AuthSessionProperties properties;
    private final java.security.SecureRandom secureRandom = new java.security.SecureRandom();

    public AuthSessionService(AuthSessionRepository authSessionRepository, AuthSessionProperties properties) {
        this.authSessionRepository = authSessionRepository;
        this.properties = properties;
    }

    public IssuedSession createSession(User user, boolean remember, HttpServletRequest request) {
        cleanupExpired();
        enforceSessionLimit(user.getId());
        String rawToken = generateToken();
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(remember ? properties.getRememberTtlSeconds() : properties.getSessionTtlSeconds());
        AuthSession session = new AuthSession();
        session.setId(UUID.randomUUID().toString());
        session.setUserId(user.getId());
        session.setTokenHash(hashToken(rawToken));
        session.setRemember(remember);
        session.setCreatedAt(now);
        session.setLastUsedAt(now);
        session.setExpiresAt(expiresAt);
        session.setUserAgent(trim(request.getHeader("User-Agent"), 300));
        session.setIpAddress(extractClientIp(request));
        authSessionRepository.save(session);
        return new IssuedSession(rawToken, expiresAt, remember);
    }

    public Optional<AuthSession> findActiveSessionByRawToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            return Optional.empty();
        }
        Optional<AuthSession> session = authSessionRepository.findByTokenHash(hashToken(rawToken));
        if (session.isEmpty()) {
            return Optional.empty();
        }
        AuthSession current = session.get();
        Instant now = Instant.now();
        if (current.getRevokedAt() != null || current.getExpiresAt() == null || current.getExpiresAt().isBefore(now)) {
            return Optional.empty();
        }
        if (current.getLastUsedAt() != null
            && current.getLastUsedAt().plusSeconds(properties.getInactivityTtlSeconds()).isBefore(now)) {
            return Optional.empty();
        }
        return Optional.of(current);
    }

    public IssuedSession rotateSession(AuthSession current, HttpServletRequest request) {
        current.setRevokedAt(Instant.now());
        authSessionRepository.save(current);
        User pseudo = new User();
        pseudo.setId(current.getUserId());
        return createSession(pseudo, current.isRemember(), request);
    }

    public void revokeByRawToken(String rawToken) {
        findActiveSessionByRawToken(rawToken).ifPresent(session -> {
            session.setRevokedAt(Instant.now());
            authSessionRepository.save(session);
        });
    }

    public void revokeAllByUserId(String userId) {
        List<AuthSession> sessions = authSessionRepository.findByUserIdAndRevokedAtIsNull(userId);
        Instant now = Instant.now();
        boolean changed = false;
        for (AuthSession session : sessions) {
            session.setRevokedAt(now);
            changed = true;
        }
        if (changed) {
            authSessionRepository.saveAll(sessions);
        }
    }

    public String buildRefreshCookie(IssuedSession issued, boolean secureRequest) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from(properties.getCookieName(), issued.rawToken())
            .httpOnly(true)
            .secure(properties.isSecureCookie() || secureRequest)
            .sameSite(properties.getSameSite())
            .path(properties.getCookiePath());
        if (issued.persistent()) {
            builder.maxAge(properties.getRememberTtlSeconds());
        }
        return builder.build().toString();
    }

    public String buildCsrfCookie(String csrfToken, boolean secureRequest) {
        return ResponseCookie.from("PMD_CSRF", csrfToken)
            .httpOnly(false)
            .secure(properties.isSecureCookie() || secureRequest)
            .sameSite(properties.getSameSite())
            .path("/")
            .maxAge(properties.getRememberTtlSeconds())
            .build()
            .toString();
    }

    public String buildClearCsrfCookie(boolean secureRequest) {
        return ResponseCookie.from("PMD_CSRF", "")
            .httpOnly(false)
            .secure(properties.isSecureCookie() || secureRequest)
            .sameSite(properties.getSameSite())
            .path("/")
            .maxAge(0)
            .build()
            .toString();
    }

    public String generateCsrfToken() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String buildClearRefreshCookie(boolean secureRequest) {
        return ResponseCookie.from(properties.getCookieName(), "")
            .httpOnly(true)
            .secure(properties.isSecureCookie() || secureRequest)
            .sameSite(properties.getSameSite())
            .path(properties.getCookiePath())
            .maxAge(0)
            .build()
            .toString();
    }

    public String extractRawRefreshToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (properties.getCookieName().equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public boolean requiresVerifiedEmail() {
        return properties.isRequireVerifiedEmail();
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return trim(forwardedFor.split(",")[0].trim(), 120);
        }
        return trim(request.getRemoteAddr(), 120);
    }

    private void enforceSessionLimit(String userId) {
        List<AuthSession> activeSessions = authSessionRepository.findByUserIdAndRevokedAtIsNull(userId).stream()
            .filter(session -> session.getExpiresAt() != null && session.getExpiresAt().isAfter(Instant.now()))
            .sorted(Comparator.comparing(AuthSession::getCreatedAt))
            .toList();
        int overflow = activeSessions.size() - properties.getMaxSessionsPerUser() + 1;
        if (overflow <= 0) {
            return;
        }
        Instant now = Instant.now();
        for (int i = 0; i < overflow; i++) {
            AuthSession session = activeSessions.get(i);
            session.setRevokedAt(now);
            authSessionRepository.save(session);
        }
    }

    private void cleanupExpired() {
        authSessionRepository.deleteByExpiresAtBefore(Instant.now().minusSeconds(60));
    }

    private String trim(String value, int maxLen) {
        if (value == null) {
            return null;
        }
        return value.length() <= maxLen ? value : value.substring(0, maxLen);
    }

    private String generateToken() {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }
}
