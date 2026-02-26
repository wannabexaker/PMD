package com.pmd.workspace.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("workspace_join_requests")
public class WorkspaceJoinRequest {

    @Id
    private String id;

    @Indexed
    private String workspaceId;

    @Indexed
    private String userId;

    private String inviteId;

    private String invitedByUserId;
    private String inviteQuestion;
    private String inviteAnswer;

    private WorkspaceJoinRequestStatus status;

    private Instant createdAt;

    private Instant decidedAt;

    private String decidedByUserId;

    public WorkspaceJoinRequest() {
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

    public String getInviteId() {
        return inviteId;
    }

    public void setInviteId(String inviteId) {
        this.inviteId = inviteId;
    }

    public String getInvitedByUserId() {
        return invitedByUserId;
    }

    public void setInvitedByUserId(String invitedByUserId) {
        this.invitedByUserId = invitedByUserId;
    }

    public String getInviteQuestion() {
        return inviteQuestion;
    }

    public void setInviteQuestion(String inviteQuestion) {
        this.inviteQuestion = inviteQuestion;
    }

    public String getInviteAnswer() {
        return inviteAnswer;
    }

    public void setInviteAnswer(String inviteAnswer) {
        this.inviteAnswer = inviteAnswer;
    }

    public WorkspaceJoinRequestStatus getStatus() {
        return status;
    }

    public void setStatus(WorkspaceJoinRequestStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getDecidedAt() {
        return decidedAt;
    }

    public void setDecidedAt(Instant decidedAt) {
        this.decidedAt = decidedAt;
    }

    public String getDecidedByUserId() {
        return decidedByUserId;
    }

    public void setDecidedByUserId(String decidedByUserId) {
        this.decidedByUserId = decidedByUserId;
    }
}
