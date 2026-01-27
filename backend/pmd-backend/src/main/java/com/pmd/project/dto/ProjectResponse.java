package com.pmd.project.dto;

import com.pmd.project.model.ProjectStatus;
import java.time.Instant;
import java.util.List;

public class ProjectResponse {

    private String id;

    private String name;

    private String description;

    private ProjectStatus status;

    private List<String> memberIds;

    private List<ProjectCommentResponse> comments;

    private Instant createdAt;

    private Instant updatedAt;

    public ProjectResponse() {
    }

    public ProjectResponse(String id, String name, String description, ProjectStatus status, List<String> memberIds,
                           List<ProjectCommentResponse> comments, Instant createdAt, Instant updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.status = status;
        this.memberIds = memberIds;
        this.comments = comments;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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

    public List<ProjectCommentResponse> getComments() {
        return comments;
    }

    public void setComments(List<ProjectCommentResponse> comments) {
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
}
