package com.pmd.user.dto;

public class UserSummaryResponse {

    private String id;

    private String displayName;

    private String email;

    private String team;

    private boolean isAdmin;

    private long activeProjectCount;

    public UserSummaryResponse() {
    }

    public UserSummaryResponse(String id, String displayName, String email, String team, boolean isAdmin,
                               long activeProjectCount) {
        this.id = id;
        this.displayName = displayName;
        this.email = email;
        this.team = team;
        this.isAdmin = isAdmin;
        this.activeProjectCount = activeProjectCount;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTeam() {
        return team;
    }

    public void setTeam(String team) {
        this.team = team;
    }

    public boolean isAdmin() {
        return isAdmin;
    }

    public void setAdmin(boolean admin) {
        isAdmin = admin;
    }

    public long getActiveProjectCount() {
        return activeProjectCount;
    }

    public void setActiveProjectCount(long activeProjectCount) {
        this.activeProjectCount = activeProjectCount;
    }
}
