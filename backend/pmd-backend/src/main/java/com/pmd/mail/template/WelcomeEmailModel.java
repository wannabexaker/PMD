package com.pmd.mail.template;

public class WelcomeEmailModel {

    private final String displayName;
    private final String email;
    private final String team;
    private final java.time.Instant createdAt;
    private final String token;

    public WelcomeEmailModel(String displayName, String email, String team, java.time.Instant createdAt, String token) {
        this.displayName = displayName;
        this.email = email;
        this.team = team;
        this.createdAt = createdAt;
        this.token = token;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getEmail() {
        return email;
    }

    public String getTeam() {
        return team;
    }

    public java.time.Instant getCreatedAt() {
        return createdAt;
    }

    public String getToken() {
        return token;
    }
}
