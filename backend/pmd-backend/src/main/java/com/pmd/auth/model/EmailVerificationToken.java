package com.pmd.auth.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("email_verification_tokens")
public class EmailVerificationToken {

    @Id
    private String id;

    private String userId;

    private String token;

    /**
     * The address this token proves ownership of. Binding the token to the email — not just the
     * user — is what lets it double as an email-change confirmation, and stops an old
     * registration link from later verifying a different address.
     */
    private String targetEmail;

    private Instant expiresAt;

    private Instant usedAt;

    public EmailVerificationToken() {
    }

    public EmailVerificationToken(String id, String userId, String token, Instant expiresAt, Instant usedAt) {
        this.id = id;
        this.userId = userId;
        this.token = token;
        this.expiresAt = expiresAt;
        this.usedAt = usedAt;
    }

    public String getTargetEmail() {
        return targetEmail;
    }

    public void setTargetEmail(String targetEmail) {
        this.targetEmail = targetEmail;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getUsedAt() {
        return usedAt;
    }

    public void setUsedAt(Instant usedAt) {
        this.usedAt = usedAt;
    }
}
