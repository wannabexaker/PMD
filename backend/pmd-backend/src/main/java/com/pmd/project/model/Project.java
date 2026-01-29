package com.pmd.project.model;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("projects")
public class Project {

    @Id
    private String id;

    private String name;

    private String description;

    private ProjectStatus status;

    private List<String> memberIds;

    private List<ProjectComment> comments;

    private Instant createdAt;

    private Instant updatedAt;

    private String createdByUserId;

    private String createdByTeam;

    private String teamId;

    @Indexed
    private String workspaceId;

    public Project() {
    }

    public Project(String id, String name, String description, ProjectStatus status, List<String> memberIds,
                   List<ProjectComment> comments, Instant createdAt, Instant updatedAt, String createdByUserId,
                   String createdByTeam, String teamId, String workspaceId) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.memberIds = memberIds;
        this.comments = comments;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.createdByUserId = createdByUserId;
        this.createdByTeam = createdByTeam;
        this.teamId = teamId;
        this.workspaceId = workspaceId;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public List<String> getMemberIds() {
        return memberIds;
    }

    public void setMemberIds(List<String> memberIds) {
        this.memberIds = memberIds;
    }

    public List<ProjectComment> getComments() {
        return comments;
    }

    public void setComments(List<ProjectComment> comments) {
        this.comments = comments;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(String createdByUserId) {
        this.createdByUserId = createdByUserId;
    }

    public String getCreatedByTeam() {
        return createdByTeam;
    }

    public void setCreatedByTeam(String createdByTeam) {
        this.createdByTeam = createdByTeam;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }
}
