package com.pmd.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "pmd.auth.session")
public class AuthSessionProperties {

    @NotBlank
    private String cookieName = "PMD_RT";

    @NotBlank
    private String cookiePath = "/api/auth";

    @NotBlank
    private String sameSite = "Lax";

    private boolean secureCookie = false;

    @Min(3600)
    private long rememberTtlSeconds = 30L * 24 * 60 * 60;

    @Min(900)
    private long sessionTtlSeconds = 24L * 60 * 60;

    @Min(1)
    private int maxSessionsPerUser = 10;

    @Min(300)
    private long inactivityTtlSeconds = 7L * 24 * 60 * 60;

    @Min(3600)
    private long revokedRetentionSeconds = 30L * 24 * 60 * 60;

    private boolean requireVerifiedEmail = false;

    public String getCookieName() {
        return cookieName;
    }

    public void setCookieName(String cookieName) {
        this.cookieName = cookieName;
    }

    public String getCookiePath() {
        return cookiePath;
    }

    public void setCookiePath(String cookiePath) {
        this.cookiePath = cookiePath;
    }

    public String getSameSite() {
        return sameSite;
    }

    public void setSameSite(String sameSite) {
        this.sameSite = sameSite;
    }

    public boolean isSecureCookie() {
        return secureCookie;
    }

    public void setSecureCookie(boolean secureCookie) {
        this.secureCookie = secureCookie;
    }

    public long getRememberTtlSeconds() {
        return rememberTtlSeconds;
    }

    public void setRememberTtlSeconds(long rememberTtlSeconds) {
        this.rememberTtlSeconds = rememberTtlSeconds;
    }

    public long getSessionTtlSeconds() {
        return sessionTtlSeconds;
    }

    public void setSessionTtlSeconds(long sessionTtlSeconds) {
        this.sessionTtlSeconds = sessionTtlSeconds;
    }

    public int getMaxSessionsPerUser() {
        return maxSessionsPerUser;
    }

    public void setMaxSessionsPerUser(int maxSessionsPerUser) {
        this.maxSessionsPerUser = maxSessionsPerUser;
    }

    public long getInactivityTtlSeconds() {
        return inactivityTtlSeconds;
    }

    public void setInactivityTtlSeconds(long inactivityTtlSeconds) {
        this.inactivityTtlSeconds = inactivityTtlSeconds;
    }

    public boolean isRequireVerifiedEmail() {
        return requireVerifiedEmail;
    }

    public void setRequireVerifiedEmail(boolean requireVerifiedEmail) {
        this.requireVerifiedEmail = requireVerifiedEmail;
    }

    public long getRevokedRetentionSeconds() {
        return revokedRetentionSeconds;
    }

    public void setRevokedRetentionSeconds(long revokedRetentionSeconds) {
        this.revokedRetentionSeconds = revokedRetentionSeconds;
    }
}
