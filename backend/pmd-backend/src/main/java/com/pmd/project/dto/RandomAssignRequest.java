package com.pmd.project.dto;

public class RandomAssignRequest {

    private String teamId;

    public RandomAssignRequest() {
    }

    public RandomAssignRequest(String teamId) {
        this.teamId = teamId;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }
}

