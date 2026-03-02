package com.pmd.workspace.dto;

import java.time.Instant;

public class WorkspaceDeletePreviewResponse {

    private String workspaceId;
    private String workspaceName;
    private long activeMembers;
    private long totalMembers;
    private long projectCount;
    private long teamCount;
    private long pendingJoinRequests;
    private long activeInvites;
    private boolean deletionPending;
    private Instant deletionRequestedAt;
    private Instant deletionScheduledAt;
    private long gracePeriodMinutes;

    public WorkspaceDeletePreviewResponse() {
    }

    public WorkspaceDeletePreviewResponse(String workspaceId, String workspaceName, long activeMembers, long totalMembers,
                                          long projectCount, long teamCount, long pendingJoinRequests, long activeInvites,
                                          boolean deletionPending, Instant deletionRequestedAt, Instant deletionScheduledAt,
                                          long gracePeriodMinutes) {
        this.workspaceId = workspaceId;
        this.workspaceName = workspaceName;
        this.activeMembers = activeMembers;
        this.totalMembers = totalMembers;
        this.projectCount = projectCount;
        this.teamCount = teamCount;
        this.pendingJoinRequests = pendingJoinRequests;
        this.activeInvites = activeInvites;
        this.deletionPending = deletionPending;
        this.deletionRequestedAt = deletionRequestedAt;
        this.deletionScheduledAt = deletionScheduledAt;
        this.gracePeriodMinutes = gracePeriodMinutes;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getWorkspaceName() {
        return workspaceName;
    }

    public void setWorkspaceName(String workspaceName) {
        this.workspaceName = workspaceName;
    }

    public long getActiveMembers() {
        return activeMembers;
    }

    public void setActiveMembers(long activeMembers) {
        this.activeMembers = activeMembers;
    }

    public long getTotalMembers() {
        return totalMembers;
    }

    public void setTotalMembers(long totalMembers) {
        this.totalMembers = totalMembers;
    }

    public long getProjectCount() {
        return projectCount;
    }

    public void setProjectCount(long projectCount) {
        this.projectCount = projectCount;
    }

    public long getTeamCount() {
        return teamCount;
    }

    public void setTeamCount(long teamCount) {
        this.teamCount = teamCount;
    }

    public long getPendingJoinRequests() {
        return pendingJoinRequests;
    }

    public void setPendingJoinRequests(long pendingJoinRequests) {
        this.pendingJoinRequests = pendingJoinRequests;
    }

    public long getActiveInvites() {
        return activeInvites;
    }

    public void setActiveInvites(long activeInvites) {
        this.activeInvites = activeInvites;
    }

    public boolean isDeletionPending() {
        return deletionPending;
    }

    public void setDeletionPending(boolean deletionPending) {
        this.deletionPending = deletionPending;
    }

    public Instant getDeletionRequestedAt() {
        return deletionRequestedAt;
    }

    public void setDeletionRequestedAt(Instant deletionRequestedAt) {
        this.deletionRequestedAt = deletionRequestedAt;
    }

    public Instant getDeletionScheduledAt() {
        return deletionScheduledAt;
    }

    public void setDeletionScheduledAt(Instant deletionScheduledAt) {
        this.deletionScheduledAt = deletionScheduledAt;
    }

    public long getGracePeriodMinutes() {
        return gracePeriodMinutes;
    }

    public void setGracePeriodMinutes(long gracePeriodMinutes) {
        this.gracePeriodMinutes = gracePeriodMinutes;
    }
}

