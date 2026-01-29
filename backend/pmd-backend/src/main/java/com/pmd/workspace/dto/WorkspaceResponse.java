package com.pmd.workspace.dto;

import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import java.time.Instant;

public class WorkspaceResponse {

    private String id;
    private String name;
    private String slug;
    private WorkspaceMemberRole role;
    private WorkspaceMemberStatus status;
    private Instant createdAt;
    private boolean demo;
    private boolean requireApproval;

    public WorkspaceResponse() {
    }

    public WorkspaceResponse(String id, String name, String slug, WorkspaceMemberRole role,
                             WorkspaceMemberStatus status, Instant createdAt, boolean demo,
                             boolean requireApproval) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
        this.demo = demo;
        this.requireApproval = requireApproval;
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

    public WorkspaceMemberRole getRole() {
        return role;
    }

    public void setRole(WorkspaceMemberRole role) {
        this.role = role;
    }

    public WorkspaceMemberStatus getStatus() {
        return status;
    }

    public void setStatus(WorkspaceMemberStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isDemo() {
        return demo;
    }

    public void setDemo(boolean demo) {
        this.demo = demo;
    }

    public boolean isRequireApproval() {
        return requireApproval;
    }

    public void setRequireApproval(boolean requireApproval) {
        this.requireApproval = requireApproval;
    }
}
