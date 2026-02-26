package com.pmd.workspace.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("workspace_invites")
public class WorkspaceInvite {

    @Id
    private String id;

    @Indexed
    private String workspaceId;

    @Indexed(unique = true)
    private String token;

    @Indexed(unique = true)
    private String code;

    private String invitedEmail;
    private String joinQuestion;
    private String defaultRoleId;

    private Instant expiresAt;

    private Integer maxUses;

    private int usesCount;

    private boolean revoked;

    private Instant createdAt;

    private String createdByUserId;

    public WorkspaceInvite() {
    }

    public WorkspaceInvite(String id, String workspaceId, String token, String code, String invitedEmail,
                           String joinQuestion, String defaultRoleId,
                           Instant expiresAt, Integer maxUses, int usesCount, boolean revoked,
                           Instant createdAt, String createdByUserId) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.token = token;
        this.code = code;
        this.invitedEmail = invitedEmail;
        this.joinQuestion = joinQuestion;
        this.defaultRoleId = defaultRoleId;
        this.expiresAt = expiresAt;
        this.maxUses = maxUses;
        this.usesCount = usesCount;
        this.revoked = revoked;
        this.createdAt = createdAt;
        this.createdByUserId = createdByUserId;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
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

    public String getDefaultRoleId() {
        return defaultRoleId;
    }

    public void setDefaultRoleId(String defaultRoleId) {
        this.defaultRoleId = defaultRoleId;
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

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(String createdByUserId) {
        this.createdByUserId = createdByUserId;
    }
}
