package com.pmd.workspace.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("workspace_members")
public class WorkspaceMember {

    @Id
    private String id;

    @Indexed
    private String workspaceId;

    @Indexed
    private String userId;

    private String roleId;

    private String displayRoleName;

    private WorkspaceMemberRole role;

    private WorkspaceMemberStatus status;

    private Instant createdAt;

    private Instant joinedAt;

    private String invitedByUserId;

    public WorkspaceMember() {
    }

    public WorkspaceMember(String id, String workspaceId, String userId, WorkspaceMemberRole role,
                           WorkspaceMemberStatus status, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
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

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public String getDisplayRoleName() {
        return displayRoleName;
    }

    public void setDisplayRoleName(String displayRoleName) {
        this.displayRoleName = displayRoleName;
    }

    public WorkspaceMemberRole getRole() {
        return role;
    }

    public void setRole(WorkspaceMemberRole role) {
        this.role = role;
    }

    public WorkspaceMemberStatus getStatus() {
        return status;
    }

    public void setStatus(WorkspaceMemberStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }

    public String getInvitedByUserId() {
        return invitedByUserId;
    }

    public void setInvitedByUserId(String invitedByUserId) {
        this.invitedByUserId = invitedByUserId;
    }
}
