package com.pmd.auth.security;

import java.util.List;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Verifies a Google Identity Services ID token server-side: RS256 signature
 * against Google's rotating JWKS, plus issuer / audience / expiry checks. Only
 * active when a Google OAuth client id is configured (pmd.google.client-id).
 */
@Component
public class GoogleTokenVerifier {

    private static final Logger logger = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final String JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
    private static final Set<String> VALID_ISSUERS = Set.of("accounts.google.com", "https://accounts.google.com");

    private final String clientId;
    private final NimbusJwtDecoder decoder;

    public GoogleTokenVerifier(@Value("${pmd.google.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        if (this.clientId.isEmpty()) {
            this.decoder = null;
            logger.info("Google login disabled (no pmd.google.client-id configured).");
            return;
        }
        NimbusJwtDecoder built = NimbusJwtDecoder.withJwkSetUri(JWKS_URI).build();
        built.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
            new JwtTimestampValidator(),
            issuerValidator(),
            audienceValidator(this.clientId)
        ));
        this.decoder = built;
    }

    public boolean isEnabled() {
        return decoder != null;
    }

    public GoogleUser verify(String idToken) {
        if (decoder == null) {
            throw new ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Google login is not configured");
        }
        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing Google credential");
        }
        Jwt jwt;
        try {
            jwt = decoder.decode(idToken);
        } catch (JwtException ex) {
            logger.debug("Google ID token rejected: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google credential");
        }
        String email = jwt.getClaimAsString("email");
        Boolean emailVerified = jwt.getClaim("email_verified");
        if (email == null || email.isBlank() || !Boolean.TRUE.equals(emailVerified)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google account email is not verified");
        }
        return new GoogleUser(
            jwt.getSubject(),
            email.trim().toLowerCase(),
            jwt.getClaimAsString("given_name"),
            jwt.getClaimAsString("family_name"),
            jwt.getClaimAsString("name")
        );
    }

    private static OAuth2TokenValidator<Jwt> issuerValidator() {
        OAuth2Error error = new OAuth2Error("invalid_issuer", "Unexpected token issuer", null);
        return jwt -> VALID_ISSUERS.contains(jwt.getIssuer() == null ? null : jwt.getIssuer().toString())
            ? OAuth2TokenValidatorResult.success()
            : OAuth2TokenValidatorResult.failure(error);
    }

    private static OAuth2TokenValidator<Jwt> audienceValidator(String clientId) {
        OAuth2Error error = new OAuth2Error("invalid_audience", "Token audience does not match this app", null);
        return jwt -> {
            List<String> audience = jwt.getAudience();
            return audience != null && audience.contains(clientId)
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(error);
        };
    }

    public record GoogleUser(String subject, String email, String firstName, String lastName, String name) {
    }
}
