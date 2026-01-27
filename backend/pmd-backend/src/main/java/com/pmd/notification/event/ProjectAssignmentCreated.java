package com.pmd.notification.event;

import java.time.Instant;

public class ProjectAssignmentCreated {

    private final String projectId;
    private final String projectName;
    private final String projectStatus;
    private final String projectDescription;
    private final String assignedUserId;
    private final String assignedUserEmail;
    private final String assignedByUserId;
    private final Instant assignedAt;

    public ProjectAssignmentCreated(String projectId, String projectName, String projectStatus,
                                    String projectDescription, String assignedUserId,
                                    String assignedUserEmail, String assignedByUserId, Instant assignedAt) {
        this.projectId = projectId;
        this.projectName = projectName;
        this.projectStatus = projectStatus;
        this.projectDescription = projectDescription;
        this.assignedUserId = assignedUserId;
        this.assignedUserEmail = assignedUserEmail;
        this.assignedByUserId = assignedByUserId;
        this.assignedAt = assignedAt;
    }

    public String getProjectId() {
        return projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public String getProjectStatus() {
        return projectStatus;
    }

    public String getProjectDescription() {
        return projectDescription;
    }

    public String getAssignedUserId() {
        return assignedUserId;
    }

    public String getAssignedUserEmail() {
        return assignedUserEmail;
    }

    public String getAssignedByUserId() {
        return assignedByUserId;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }
}
