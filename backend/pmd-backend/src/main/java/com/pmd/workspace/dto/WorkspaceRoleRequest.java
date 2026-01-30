package com.pmd.workspace.dto;

import com.pmd.workspace.model.WorkspaceRolePermissions;
import jakarta.validation.constraints.NotBlank;

public class WorkspaceRoleRequest {

    @NotBlank
    private String name;

    private WorkspaceRolePermissions permissions;

    public WorkspaceRoleRequest() {
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public WorkspaceRolePermissions getPermissions() {
        return permissions;
    }

    public void setPermissions(WorkspaceRolePermissions permissions) {
        this.permissions = permissions;
    }
}
