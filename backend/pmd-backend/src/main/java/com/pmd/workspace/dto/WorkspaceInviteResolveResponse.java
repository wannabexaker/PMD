package com.pmd.workspace.dto;

import java.time.Instant;

public class WorkspaceInviteResolveResponse {

    private String workspaceId;
    private String workspaceName;
    private String token;
    private String code;
    private Instant expiresAt;
    private Integer maxUses;
    private int usesCount;
    private boolean revoked;

    public WorkspaceInviteResolveResponse() {
    }

    public WorkspaceInviteResolveResponse(String workspaceId, String workspaceName, String token, String code,
                                          Instant expiresAt, Integer maxUses, int usesCount, boolean revoked) {
        this.workspaceId = workspaceId;
        this.workspaceName = workspaceName;
        this.token = token;
        this.code = code;
        this.expiresAt = expiresAt;
        this.maxUses = maxUses;
        this.usesCount = usesCount;
        this.revoked = revoked;
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

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
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

    public int getUsesCount() {
        return usesCount;
    }

    public void setUsesCount(int usesCount) {
        this.usesCount = usesCount;
    }

    public boolean isRevoked() {
        return revoked;
    }

    public void setRevoked(boolean revoked) {
        this.revoked = revoked;
    }
}
