package com.pmd.team.dto;

public class TeamUpdateRequest {

    private String name;
    private Boolean isActive;
    private String color;

    public TeamUpdateRequest() {
    }

    public TeamUpdateRequest(String name, Boolean isActive, String color) {
        this.name = name;
        this.isActive = isActive;
        this.color = color;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Boolean getIsActive() {
        return isActive;
    }

    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }
}
