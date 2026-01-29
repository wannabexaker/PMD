package com.pmd.team.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("teams")
@CompoundIndexes({
    @CompoundIndex(name = "team_workspace_slug", def = "{'workspaceId': 1, 'slug': 1}", unique = true),
    @CompoundIndex(name = "team_workspace_name", def = "{'workspaceId': 1, 'name': 1}", unique = true)
})
public class Team {

    @Id
    private String id;

    private String slug;

    private String name;

    @Indexed
    private String workspaceId;

    private boolean isActive;

    private Instant createdAt;

    private String createdBy;

    public Team() {
    }

    public Team(String id, String name, String slug, String workspaceId, boolean isActive, Instant createdAt, String createdBy) {
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

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
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
