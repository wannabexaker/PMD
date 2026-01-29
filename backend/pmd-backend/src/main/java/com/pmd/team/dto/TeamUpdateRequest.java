package com.pmd.team.dto;

public class TeamUpdateRequest {

    private String name;
    private Boolean isActive;

    public TeamUpdateRequest() {
    }

    public TeamUpdateRequest(String name, Boolean isActive) {
        this.name = name;
        this.isActive = isActive;
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
}
