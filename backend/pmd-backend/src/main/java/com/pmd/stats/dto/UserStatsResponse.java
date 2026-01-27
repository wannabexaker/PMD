package com.pmd.stats.dto;

import java.util.List;

public class UserStatsResponse {

    private String userId;
    private List<StatSlice> statusBreakdown;
    private List<StatSlice> activeInactiveBreakdown;
    private long timeSpentWeekMinutes;
    private long timeSpentMonthMinutes;
    private TeamAverages teamAverages;

    public UserStatsResponse() {
    }

    public UserStatsResponse(String userId, List<StatSlice> statusBreakdown, List<StatSlice> activeInactiveBreakdown,
                             long timeSpentWeekMinutes, long timeSpentMonthMinutes, TeamAverages teamAverages) {
        this.userId = userId;
        this.statusBreakdown = statusBreakdown;
        this.activeInactiveBreakdown = activeInactiveBreakdown;
        this.timeSpentWeekMinutes = timeSpentWeekMinutes;
        this.timeSpentMonthMinutes = timeSpentMonthMinutes;
        this.teamAverages = teamAverages;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public List<StatSlice> getStatusBreakdown() {
        return statusBreakdown;
    }

    public void setStatusBreakdown(List<StatSlice> statusBreakdown) {
        this.statusBreakdown = statusBreakdown;
    }

    public List<StatSlice> getActiveInactiveBreakdown() {
        return activeInactiveBreakdown;
    }

    public void setActiveInactiveBreakdown(List<StatSlice> activeInactiveBreakdown) {
        this.activeInactiveBreakdown = activeInactiveBreakdown;
    }

    public long getTimeSpentWeekMinutes() {
        return timeSpentWeekMinutes;
    }

    public void setTimeSpentWeekMinutes(long timeSpentWeekMinutes) {
        this.timeSpentWeekMinutes = timeSpentWeekMinutes;
    }

    public long getTimeSpentMonthMinutes() {
        return timeSpentMonthMinutes;
    }

    public void setTimeSpentMonthMinutes(long timeSpentMonthMinutes) {
        this.timeSpentMonthMinutes = timeSpentMonthMinutes;
    }

    public TeamAverages getTeamAverages() {
        return teamAverages;
    }

    public void setTeamAverages(TeamAverages teamAverages) {
        this.teamAverages = teamAverages;
    }

    public static class TeamAverages {
        private double activeProjects;

        public TeamAverages() {
        }

        public TeamAverages(double activeProjects) {
            this.activeProjects = activeProjects;
        }

        public double getActiveProjects() {
            return activeProjects;
        }

        public void setActiveProjects(double activeProjects) {
            this.activeProjects = activeProjects;
        }
    }
}
