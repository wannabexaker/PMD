package com.pmd.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.Map;
import javax.crypto.SecretKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final Logger logger = LoggerFactory.getLogger(JwtService.class);
    private static final int MIN_SECRET_BYTES = 32;

    private final SecretKey secretKey;
    private final long expirationSeconds;

    public JwtService(
        @Value("${pmd.jwt.secret:}") String secret,
        @Value("${pmd.jwt.expirationSeconds:86400}") long expirationSeconds,
        Environment environment
    ) {
        String resolvedSecret = resolveSecret(secret, environment);
        this.secretKey = Keys.hmacShaKeyFor(resolvedSecret.getBytes(StandardCharsets.UTF_8));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(String subject, Map<String, Object> claims) {
        Instant now = Instant.now();
        return Jwts.builder().subject(subject).issuedAt(Date.from(now)).expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .claims(claims)
            .signWith(secretKey, SignatureAlgorithm.HS256)
            .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private String resolveSecret(String secret, Environment environment) {
        String value = secret != null ? secret : "";
        if (value.getBytes(StandardCharsets.UTF_8).length >= MIN_SECRET_BYTES) {
            return value;
        }

        boolean isLocalProfile = environment.acceptsProfiles(Profiles.of("local", "dev"));
        if (isLocalProfile) {
            logger.warn("PMD_JWT_SECRET is missing or too short; auto-generating a local-only secret.");
            byte[] bytes = new byte[MIN_SECRET_BYTES];
            new SecureRandom().nextBytes(bytes);
            return Base64.getEncoder().encodeToString(bytes);
        }

        throw new IllegalStateException("PMD_JWT_SECRET must be set and at least 32 bytes (256 bits).");
    }
}
