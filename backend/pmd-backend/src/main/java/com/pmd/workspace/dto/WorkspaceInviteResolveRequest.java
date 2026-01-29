package com.pmd.workspace.dto;

public class WorkspaceInviteResolveRequest {

    private String invite;

    public WorkspaceInviteResolveRequest() {
    }

    public WorkspaceInviteResolveRequest(String invite) {
        this.invite = invite;
    }

    public String getInvite() {
        return invite;
    }

    public void setInvite(String invite) {
        this.invite = invite;
    }
}
