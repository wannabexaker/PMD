package com.pmd.workspace.dto;

import java.time.Instant;

public class WorkspaceInviteCreateRequest {

    private Instant expiresAt;
    private Integer maxUses;

    public WorkspaceInviteCreateRequest() {
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Integer getMaxUses() {
        return maxUses;
    }

    public void setMaxUses(Integer maxUses) {
        this.maxUses = maxUses;
    }
}
