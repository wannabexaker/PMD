package com.pmd.auth.security;

public class UserPrincipal {

    private final String id;
    private final String username;
    private final String displayName;

    public UserPrincipal(String id, String username, String displayName) {
        this.id = id;
        this.username = username;
        this.displayName = displayName;
    }

    public String getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public String getDisplayName() {
        return displayName;
    }
}