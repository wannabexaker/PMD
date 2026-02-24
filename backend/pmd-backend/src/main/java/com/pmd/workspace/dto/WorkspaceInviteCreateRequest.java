package com.pmd.workspace.dto;

import java.time.Instant;

public class WorkspaceInviteCreateRequest {

    private Instant expiresAt;
    private Integer maxUses;
    private String defaultRoleId;

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

    public String getDefaultRoleId() {
        return defaultRoleId;
    }

    public void setDefaultRoleId(String defaultRoleId) {
        this.defaultRoleId = defaultRoleId;
    }
}
