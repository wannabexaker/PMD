package com.pmd.project.dto;

import com.pmd.project.model.ProjectStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class ProjectRequest {

    @NotBlank
    private String name;

    private String description;

    @NotNull
    private ProjectStatus status;

    @NotBlank
    private String teamId;

    private List<String> memberIds;

    public ProjectRequest() {
    }

    public ProjectRequest(String name, String description, ProjectStatus status, String teamId, List<String> memberIds) {
        this.name = name;
        this.description = description;
        this.status = status;
        this.teamId = teamId;
        this.memberIds = memberIds;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public ProjectStatus getStatus() {
        return status;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public String getTeamId() {
        return teamId;
    }

    public void setTeamId(String teamId) {
        this.teamId = teamId;
    }

    public List<String> getMemberIds() {
        return memberIds;
    }

    public void setMemberIds(List<String> memberIds) {
        this.memberIds = memberIds;
    }
}
