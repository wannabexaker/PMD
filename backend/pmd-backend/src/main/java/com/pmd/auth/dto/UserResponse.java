package com.pmd.auth.dto;

public class UserResponse {

    private String id;

    private String username;

    private String displayName;

    private String email;

    private String firstName;

    private String lastName;

    private String team;

    private String teamId;

    private String teamName;

    private boolean isAdmin;

    private String bio;

    private String avatarUrl;

    private boolean emailVerified;

    private boolean mustChangePassword;

    private com.pmd.user.model.PeoplePageWidgets peoplePageWidgets;

    public UserResponse() {
    }

    public UserResponse(String id, String username, String displayName, String email, String firstName,
                        String lastName, String team, String teamId, String teamName, boolean isAdmin, String bio, String avatarUrl, boolean emailVerified,
                        boolean mustChangePassword, com.pmd.user.model.PeoplePageWidgets peoplePageWidgets) {
        this.id = id;
        this.username = username;
        this.displayName = displayName;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.team = team;
        this.teamId = teamId;
        this.teamName = teamName;
        this.isAdmin = isAdmin;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.emailVerified = emailVerified;
        this.mustChangePassword = mustChangePassword;
        this.peoplePageWidgets = peoplePageWidgets;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
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

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
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

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public boolean isEmailVerified() {
        return emailVerified;
    }

    public void setEmailVerified(boolean emailVerified) {
        this.emailVerified = emailVerified;
    }

    public boolean isMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }

    public com.pmd.user.model.PeoplePageWidgets getPeoplePageWidgets() {
        return peoplePageWidgets;
    }

    public void setPeoplePageWidgets(com.pmd.user.model.PeoplePageWidgets peoplePageWidgets) {
        this.peoplePageWidgets = peoplePageWidgets;
    }
}
