package com.pmd.project.dto;

import com.pmd.user.dto.UserSummaryResponse;

public class RandomAssignResponse {

    private ProjectResponse project;

    private UserSummaryResponse assignedPerson;

    public RandomAssignResponse() {
    }

    public RandomAssignResponse(ProjectResponse project, UserSummaryResponse assignedPerson) {
        this.project = project;
        this.assignedPerson = assignedPerson;
    }

    public ProjectResponse getProject() {
        return project;
    }

    public void setProject(ProjectResponse project) {
        this.project = project;
    }

    public UserSummaryResponse getAssignedPerson() {
        return assignedPerson;
    }

    public void setAssignedPerson(UserSummaryResponse assignedPerson) {
        this.assignedPerson = assignedPerson;
    }
}

