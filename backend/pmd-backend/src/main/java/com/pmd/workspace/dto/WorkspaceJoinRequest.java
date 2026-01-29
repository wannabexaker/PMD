package com.pmd.workspace.dto;

import jakarta.validation.constraints.NotBlank;

public class WorkspaceJoinRequest {

    @NotBlank
    private String token;

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
}
