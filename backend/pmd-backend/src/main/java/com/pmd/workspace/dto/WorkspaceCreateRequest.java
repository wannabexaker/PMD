package com.pmd.workspace.dto;

import jakarta.validation.constraints.NotBlank;

public class WorkspaceCreateRequest {

    @NotBlank
    private String name;

    public WorkspaceCreateRequest() {
    }

    public WorkspaceCreateRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
