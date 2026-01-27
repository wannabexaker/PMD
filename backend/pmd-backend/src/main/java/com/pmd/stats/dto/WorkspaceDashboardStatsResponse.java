package com.pmd.stats.dto;

import java.util.List;

public class WorkspaceDashboardStatsResponse {

    private DashboardCounters counters;
    private DashboardPies pies;
    private StatsScope scope;

    public WorkspaceDashboardStatsResponse() {
    }

    public WorkspaceDashboardStatsResponse(DashboardCounters counters, DashboardPies pies, StatsScope scope) {
        this.counters = counters;
        this.pies = pies;
        this.scope = scope;
    }

    public DashboardCounters getCounters() {
        return counters;
    }

    public void setCounters(DashboardCounters counters) {
        this.counters = counters;
    }

    public DashboardPies getPies() {
        return pies;
    }

    public void setPies(DashboardPies pies) {
        this.pies = pies;
    }

    public StatsScope getScope() {
        return scope;
    }

    public void setScope(StatsScope scope) {
        this.scope = scope;
    }

    public static class DashboardPies {
        private List<StatSlice> projectsByStatus;
        private List<StatSlice> projectsByTeam;
        private List<StatSlice> workloadByTeam;

        public DashboardPies() {
        }

        public DashboardPies(List<StatSlice> projectsByStatus, List<StatSlice> projectsByTeam,
                             List<StatSlice> workloadByTeam) {
            this.projectsByStatus = projectsByStatus;
            this.projectsByTeam = projectsByTeam;
            this.workloadByTeam = workloadByTeam;
        }

        public List<StatSlice> getProjectsByStatus() {
            return projectsByStatus;
        }

        public void setProjectsByStatus(List<StatSlice> projectsByStatus) {
            this.projectsByStatus = projectsByStatus;
        }

        public List<StatSlice> getProjectsByTeam() {
            return projectsByTeam;
        }

        public void setProjectsByTeam(List<StatSlice> projectsByTeam) {
            this.projectsByTeam = projectsByTeam;
        }

        public List<StatSlice> getWorkloadByTeam() {
            return workloadByTeam;
        }

        public void setWorkloadByTeam(List<StatSlice> workloadByTeam) {
            this.workloadByTeam = workloadByTeam;
        }
    }

    public static class StatsScope {
        private List<String> teams;
        private List<String> selectedTeams;
        private boolean assignedToMe;

        public StatsScope() {
        }

        public StatsScope(List<String> teams, List<String> selectedTeams, boolean assignedToMe) {
            this.teams = teams;
            this.selectedTeams = selectedTeams;
            this.assignedToMe = assignedToMe;
        }

        public List<String> getTeams() {
            return teams;
        }

        public void setTeams(List<String> teams) {
            this.teams = teams;
        }

        public List<String> getSelectedTeams() {
            return selectedTeams;
        }

        public void setSelectedTeams(List<String> selectedTeams) {
            this.selectedTeams = selectedTeams;
        }

        public boolean isAssignedToMe() {
            return assignedToMe;
        }

        public void setAssignedToMe(boolean assignedToMe) {
            this.assignedToMe = assignedToMe;
        }
    }
}
