package com.pmd.workspace.dto;

import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import java.time.Instant;

public class WorkspaceJoinRequestResponse {

    private String id;
    private String workspaceId;
    private String userId;
    private String userName;
    private String userEmail;
    private String inviteQuestion;
    private String inviteAnswer;
    private WorkspaceJoinRequestStatus status;
    private Instant createdAt;

    public WorkspaceJoinRequestResponse() {
    }

    public WorkspaceJoinRequestResponse(String id, String workspaceId, String userId,
                                        String userName, String userEmail,
                                        String inviteQuestion, String inviteAnswer,
                                        WorkspaceJoinRequestStatus status, Instant createdAt) {
        this.id = id;
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.userName = userName;
        this.userEmail = userEmail;
        this.inviteQuestion = inviteQuestion;
        this.inviteAnswer = inviteAnswer;
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

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
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
}
