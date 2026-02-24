package com.pmd.team.dto;

import jakarta.validation.constraints.NotBlank;

public class TeamRequest {

    @NotBlank
    private String name;
    private String color;

    public TeamRequest() {
    }

    public TeamRequest(String name) {
        this.name = name;
    }

    public TeamRequest(String name, String color) {
        this.name = name;
        this.color = color;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}
