package com.pmd.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class WorkspaceDeleteRequest {

    @NotBlank(message = "Workspace name confirmation is required")
    @Size(max = 120, message = "Workspace name confirmation is too long")
    private String confirmName;

    public WorkspaceDeleteRequest() {
    }

    public String getConfirmName() {
        return confirmName;
    }

    public void setConfirmName(String confirmName) {
        this.confirmName = confirmName;
    }
}
