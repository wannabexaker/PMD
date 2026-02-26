package com.pmd.workspace.dto;

import java.time.Instant;

public class WorkspaceInviteCreateRequest {

    private Instant expiresAt;
    private Integer maxUses;
    private String defaultRoleId;
    private String invitedEmail;
    private String joinQuestion;

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

    public String getInvitedEmail() {
        return invitedEmail;
    }

    public void setInvitedEmail(String invitedEmail) {
        this.invitedEmail = invitedEmail;
    }

    public String getJoinQuestion() {
        return joinQuestion;
    }

    public void setJoinQuestion(String joinQuestion) {
        this.joinQuestion = joinQuestion;
    }
}
