package com.pmd.notification.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("workspace_invite_accepted_digest")
public class WorkspaceInviteAcceptedDigestEntry {

    @Id
    private String id;

    @Indexed
    private String recipientUserId;

    @Indexed
    private String workspaceId;

    private String workspaceName;

    private String joinedUserId;

    private String joinedUserName;

    private Instant joinedAt;

    @Indexed
    private Instant createdAt;

    private Instant deliveredAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getRecipientUserId() {
        return recipientUserId;
    }

    public void setRecipientUserId(String recipientUserId) {
        this.recipientUserId = recipientUserId;
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

    public String getJoinedUserId() {
        return joinedUserId;
    }

    public void setJoinedUserId(String joinedUserId) {
        this.joinedUserId = joinedUserId;
    }

    public String getJoinedUserName() {
        return joinedUserName;
    }

    public void setJoinedUserName(String joinedUserName) {
        this.joinedUserName = joinedUserName;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getDeliveredAt() {
        return deliveredAt;
    }

    public void setDeliveredAt(Instant deliveredAt) {
        this.deliveredAt = deliveredAt;
    }
}

