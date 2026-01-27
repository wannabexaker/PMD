package com.pmd.stats.dto;

public class DashboardCounters {

    private long assigned;
    private long inProgress;
    private long completed;

    public DashboardCounters() {
    }

    public DashboardCounters(long assigned, long inProgress, long completed) {
        this.assigned = assigned;
        this.inProgress = inProgress;
        this.completed = completed;
    }

    public long getAssigned() {
        return assigned;
    }

    public void setAssigned(long assigned) {
        this.assigned = assigned;
    }

    public long getInProgress() {
        return inProgress;
    }

    public void setInProgress(long inProgress) {
        this.inProgress = inProgress;
    }

    public long getCompleted() {
        return completed;
    }

    public void setCompleted(long completed) {
        this.completed = completed;
    }
}
