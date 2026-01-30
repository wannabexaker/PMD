package com.pmd.workspace.dto;

import com.pmd.workspace.model.WorkspaceRolePermissions;
import java.time.Instant;

public class WorkspaceRoleResponse {

    private String id;
    private String workspaceId;
    private String name;
    private boolean system;
    private WorkspaceRolePermissions permissions;
    private Instant createdAt;

    public WorkspaceRoleResponse() {
    }

    public WorkspaceRoleResponse(String id, String workspaceId, String name, boolean system,
                                 WorkspaceRolePermissions permissions, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.name = name;
        this.system = system;
        this.permissions = permissions;
        this.createdAt = createdAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public boolean isSystem() {
        return system;
    }

    public void setSystem(boolean system) {
        this.system = system;
    }

    public WorkspaceRolePermissions getPermissions() {
        return permissions;
    }

    public void setPermissions(WorkspaceRolePermissions permissions) {
        this.permissions = permissions;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
