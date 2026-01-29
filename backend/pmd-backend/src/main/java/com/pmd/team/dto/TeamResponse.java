package com.pmd.team.dto;

import java.time.Instant;

public class TeamResponse {

    private String id;
    private String name;
    private String slug;
    private String workspaceId;
    private boolean isActive;
    private Instant createdAt;
    private String createdBy;

    public TeamResponse() {
    }

    public TeamResponse(String id, String name, String slug, String workspaceId, boolean isActive,
                        Instant createdAt, String createdBy) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.workspaceId = workspaceId;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
