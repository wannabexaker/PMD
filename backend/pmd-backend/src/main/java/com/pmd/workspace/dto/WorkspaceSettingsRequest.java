package com.pmd.workspace.dto;

public class WorkspaceSettingsRequest {

    private Boolean requireApproval;

    public WorkspaceSettingsRequest() {
    }

    public Boolean getRequireApproval() {
        return requireApproval;
    }

    public void setRequireApproval(Boolean requireApproval) {
        this.requireApproval = requireApproval;
    }
}
