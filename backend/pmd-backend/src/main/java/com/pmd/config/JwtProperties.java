package com.pmd.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "pmd.jwt")
public class JwtProperties {

    @NotBlank(message = "pmd.jwt.secret must be set (use PMD_JWT_SECRET) and at least 32 chars")
    @Size(min = 32, message = "pmd.jwt.secret must be at least 32 chars (256 bits)")
    private String secret;

    @Min(value = 60, message = "pmd.jwt.expirationSeconds must be >= 60")
    private long expirationSeconds = 86400;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    public void setExpirationSeconds(long expirationSeconds) {
        this.expirationSeconds = expirationSeconds;
    }
}
