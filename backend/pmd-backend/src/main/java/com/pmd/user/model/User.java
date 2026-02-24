package com.pmd.user.model;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("users")
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String username;

    private String passwordHash;

    private String displayName;

    private String email;

    private String firstName;

    private String lastName;

    private String team;

    @Indexed
    private String teamId;

    private boolean isAdmin;

    private String bio;

    private String avatarUrl;

    private boolean emailVerified;

    private boolean mustChangePassword;

    private int schemaVersion = 1;

    private Instant createdAt;

    private List<String> recommendedByUserIds = new ArrayList<>();

    private int recommendedCount;

    private PeoplePageWidgets peoplePageWidgets;

    public User() {
    }

    public User(String id, String username, String passwordHash, String displayName, String email, String firstName,
                String lastName, String team, String teamId, boolean isAdmin, String bio, String avatarUrl, boolean emailVerified, Instant createdAt,
                List<String> recommendedByUserIds, int recommendedCount, PeoplePageWidgets peoplePageWidgets) {
        this.id = id;
        this.username = username;
        this.passwordHash = passwordHash;
        this.displayName = displayName;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.team = team;
        this.teamId = teamId;
        this.isAdmin = isAdmin;
        this.bio = bio;
        this.avatarUrl = avatarUrl;
        this.emailVerified = emailVerified;
        this.createdAt = createdAt;
        this.recommendedByUserIds = recommendedByUserIds != null ? recommendedByUserIds : new ArrayList<>();
        this.recommendedCount = recommendedCount;
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

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public int getSchemaVersion() {
        return schemaVersion;
    }

    public void setSchemaVersion(int schemaVersion) {
        this.schemaVersion = schemaVersion;
    }

    public List<String> getRecommendedByUserIds() {
        return recommendedByUserIds;
    }

    public void setRecommendedByUserIds(List<String> recommendedByUserIds) {
        this.recommendedByUserIds = recommendedByUserIds;
    }

    public int getRecommendedCount() {
        return recommendedCount;
    }

    public void setRecommendedCount(int recommendedCount) {
        this.recommendedCount = recommendedCount;
    }

    public PeoplePageWidgets getPeoplePageWidgets() {
        return peoplePageWidgets;
    }

    public void setPeoplePageWidgets(PeoplePageWidgets peoplePageWidgets) {
        this.peoplePageWidgets = peoplePageWidgets;
    }
}
