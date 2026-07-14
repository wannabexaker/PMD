package com.pmd.auth.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

/**
 * Server-side verification of Cloudflare Turnstile tokens (bot protection on the
 * auth endpoints). No-op when no secret is configured, so local/dev runs without
 * Turnstile keys still work; enabled automatically once pmd.turnstile.secret is set.
 */
@Component
public class TurnstileService {

    private static final Logger logger = LoggerFactory.getLogger(TurnstileService.class);
    private static final String SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final String secret;
    private final RestClient restClient;

    public TurnstileService(@Value("${pmd.turnstile.secret:}") String secret) {
        this.secret = secret == null ? "" : secret.trim();
        this.restClient = RestClient.create();
        if (this.secret.isEmpty()) {
            logger.info("Turnstile verification disabled (no pmd.turnstile.secret configured).");
        }
    }

    public boolean isEnabled() {
        return !secret.isEmpty();
    }

    /**
     * Validates the client-supplied Turnstile token. Throws 400 when enabled and
     * the token is missing/invalid; silently returns when disabled.
     */
    public void verifyOrThrow(String token, String remoteIp) {
        if (secret.isEmpty()) {
            return;
        }
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Captcha verification is required.");
        }
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secret);
        form.add("response", token);
        if (remoteIp != null && !remoteIp.isBlank()) {
            form.add("remoteip", remoteIp);
        }
        SiteVerifyResponse response;
        try {
            response = restClient.post()
                .uri(SITEVERIFY_URL)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(SiteVerifyResponse.class);
        } catch (Exception ex) {
            logger.warn("Turnstile siteverify request failed: {}", ex.getMessage());
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Captcha verification is temporarily unavailable.");
        }
        if (response == null || !response.success()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Captcha verification failed. Please try again.");
        }
    }

    // Only `success` is needed; unknown fields are ignored by the default mapper.
    record SiteVerifyResponse(boolean success) {
    }
}
