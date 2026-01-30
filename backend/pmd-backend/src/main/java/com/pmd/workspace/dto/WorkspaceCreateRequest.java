package com.pmd.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public class WorkspaceCreateRequest {

    @NotBlank
    private String name;

    private List<WorkspaceInitialTeam> initialTeams;

    public WorkspaceCreateRequest() {
    }

    public WorkspaceCreateRequest(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<WorkspaceInitialTeam> getInitialTeams() {
        return initialTeams;
    }

    public void setInitialTeams(List<WorkspaceInitialTeam> initialTeams) {
        this.initialTeams = initialTeams;
    }

    public static class WorkspaceInitialTeam {
        @NotBlank
        private String name;

        public WorkspaceInitialTeam() {
        }

        public WorkspaceInitialTeam(String name) {
            this.name = name;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }
    }
}
