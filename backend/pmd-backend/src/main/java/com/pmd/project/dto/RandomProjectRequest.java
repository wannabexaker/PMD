package com.pmd.project.dto;

public class RandomProjectRequest {

    private String teamId;

    public RandomProjectRequest() {
    }

    public RandomProjectRequest(String teamId) {
        this.teamId = teamId;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }
}

