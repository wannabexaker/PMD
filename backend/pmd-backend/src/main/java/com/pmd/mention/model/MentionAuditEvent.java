package com.pmd.mention.model;

import java.time.Instant;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("mention_audit_events")
public class MentionAuditEvent {

    @Id
    private String id;

    @Indexed
    private String workspaceId;

    @Indexed
    private String projectId;

    @Indexed
    private String actorUserId;

    @Indexed
    private Instant createdAt;

    private String source;
    private String outcome;
    private String detail;
    private boolean everyoneMention;
    private int mentionTargetCount;
    private List<String> targets;

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

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getActorUserId() {
        return actorUserId;
    }

    public void setActorUserId(String actorUserId) {
        this.actorUserId = actorUserId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public String getOutcome() {
        return outcome;
    }

    public void setOutcome(String outcome) {
        this.outcome = outcome;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public boolean isEveryoneMention() {
        return everyoneMention;
    }

    public void setEveryoneMention(boolean everyoneMention) {
        this.everyoneMention = everyoneMention;
    }

    public int getMentionTargetCount() {
        return mentionTargetCount;
    }

    public void setMentionTargetCount(int mentionTargetCount) {
        this.mentionTargetCount = mentionTargetCount;
    }

    public List<String> getTargets() {
        return targets;
    }

    public void setTargets(List<String> targets) {
        this.targets = targets;
    }
}

