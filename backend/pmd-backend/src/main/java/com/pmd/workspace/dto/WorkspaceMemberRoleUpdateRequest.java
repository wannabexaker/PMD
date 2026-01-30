package com.pmd.workspace.dto;

import jakarta.validation.constraints.NotBlank;

public class WorkspaceMemberRoleUpdateRequest {

    @NotBlank
    private String roleId;

    public WorkspaceMemberRoleUpdateRequest() {
    }

    public WorkspaceMemberRoleUpdateRequest(String roleId) {
        this.roleId = roleId;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }
}
