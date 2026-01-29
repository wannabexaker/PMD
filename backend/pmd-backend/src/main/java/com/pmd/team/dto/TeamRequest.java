package com.pmd.team.dto;

import jakarta.validation.constraints.NotBlank;

public class TeamRequest {

    @NotBlank
    private String name;

    public TeamRequest() {
    }

    public TeamRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
