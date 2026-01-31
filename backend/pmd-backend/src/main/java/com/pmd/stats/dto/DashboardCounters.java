package com.pmd.stats.dto;

public class DashboardCounters {

    private long unassigned;
    private long assigned;
    private long inProgress;
    private long completed;
    private long canceled;
    private long archived;

    public DashboardCounters() {
    }

    public DashboardCounters(long unassigned, long assigned, long inProgress, long completed, long canceled,
                             long archived) {
        this.unassigned = unassigned;
        this.assigned = assigned;
        this.inProgress = inProgress;
        this.completed = completed;
        this.canceled = canceled;
        this.archived = archived;
    }

    public long getUnassigned() {
        return unassigned;
    }

    public void setUnassigned(long unassigned) {
        this.unassigned = unassigned;
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

    public long getCanceled() {
        return canceled;
    }

    public void setCanceled(long canceled) {
        this.canceled = canceled;
    }

    public long getArchived() {
        return archived;
    }

    public void setArchived(long archived) {
        this.archived = archived;
    }
}
