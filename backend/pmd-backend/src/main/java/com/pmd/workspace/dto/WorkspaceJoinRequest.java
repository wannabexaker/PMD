package com.pmd.workspace.dto;

import jakarta.validation.constraints.NotBlank;

public class WorkspaceJoinRequest {

    @NotBlank
    private String token;
    private String inviteAnswer;

    public WorkspaceJoinRequest() {
    }

    public WorkspaceJoinRequest(String token) {
        this.token = token;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getInviteAnswer() {
        return inviteAnswer;
    }

    public void setInviteAnswer(String inviteAnswer) {
        this.inviteAnswer = inviteAnswer;
    }
}
