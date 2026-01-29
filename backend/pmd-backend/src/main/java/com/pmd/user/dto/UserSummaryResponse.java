package com.pmd.user.dto;

public class UserSummaryResponse {

    private String id;

    private String displayName;

    private String email;

    private String team;

    private String teamId;

    private String teamName;

    private boolean isAdmin;

    private long activeProjectCount;

    private int recommendedCount;

    private boolean recommendedByMe;

    public UserSummaryResponse() {
    }

    public UserSummaryResponse(String id, String displayName, String email, String team,
                               String teamId, String teamName, boolean isAdmin,
                               long activeProjectCount, int recommendedCount, boolean recommendedByMe) {
        this.id = id;
        this.displayName = displayName;
        this.email = email;
        this.team = team;
        this.teamId = teamId;
        this.teamName = teamName;
        this.isAdmin = isAdmin;
        this.activeProjectCount = activeProjectCount;
        this.recommendedCount = recommendedCount;
        this.recommendedByMe = recommendedByMe;
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

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getTeamName() {
        return teamName;
    }

    public void setTeamName(String teamName) {
        this.teamName = teamName;
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

    public int getRecommendedCount() {
        return recommendedCount;
    }

    public void setRecommendedCount(int recommendedCount) {
        this.recommendedCount = recommendedCount;
    }

    public boolean isRecommendedByMe() {
        return recommendedByMe;
    }

    public void setRecommendedByMe(boolean recommendedByMe) {
        this.recommendedByMe = recommendedByMe;
    }
}
