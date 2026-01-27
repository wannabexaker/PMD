package com.pmd.mail.template;

import java.time.Instant;

public class AssignmentEmailModel {

    private final String projectName;
    private final String projectStatus;
    private final String projectDescription;
    private final String assignedByName;
    private final String assignedByEmail;
    private final String assignedToName;
    private final String assignedToEmail;
    private final Instant assignedAt;

    public AssignmentEmailModel(String projectName, String projectStatus, String projectDescription,
                                String assignedByName, String assignedByEmail,
                                String assignedToName, String assignedToEmail, Instant assignedAt) {
        this.projectName = projectName;
        this.projectStatus = projectStatus;
        this.projectDescription = projectDescription;
        this.assignedByName = assignedByName;
        this.assignedByEmail = assignedByEmail;
        this.assignedToName = assignedToName;
        this.assignedToEmail = assignedToEmail;
        this.assignedAt = assignedAt;
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

    public String getAssignedByName() {
        return assignedByName;
    }

    public String getAssignedByEmail() {
        return assignedByEmail;
    }

    public String getAssignedToName() {
        return assignedToName;
    }

    public String getAssignedToEmail() {
        return assignedToEmail;
    }

    public Instant getAssignedAt() {
        return assignedAt;
    }
}
