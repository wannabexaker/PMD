package com.pmd.project.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("project_comments")
@CompoundIndexes({
    @CompoundIndex(name = "project_created_at_idx", def = "{'projectId': 1, 'createdAt': -1}")
})
public class ProjectCommentEntity {

    @Id
    private String id;

    private String projectId;

    private String authorUserId;

    private String authorName;

    private String message;

    private Instant createdAt;

    private Integer timeSpentMinutes;

    private Map<String, List<String>> reactions;

    private CommentAttachment attachment;

    public ProjectCommentEntity() {
    }

    public ProjectCommentEntity(String id, String projectId, String authorUserId, String authorName, String message,
                                Instant createdAt, Integer timeSpentMinutes, Map<String, List<String>> reactions,
                                CommentAttachment attachment) {
        this.id = id;
        this.projectId = projectId;
        this.authorUserId = authorUserId;
        this.authorName = authorName;
        this.message = message;
        this.createdAt = createdAt;
        this.timeSpentMinutes = timeSpentMinutes;
        this.reactions = reactions;
        this.attachment = attachment;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getAuthorUserId() {
        return authorUserId;
    }

    public void setAuthorUserId(String authorUserId) {
        this.authorUserId = authorUserId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getTimeSpentMinutes() {
        return timeSpentMinutes;
    }

    public void setTimeSpentMinutes(Integer timeSpentMinutes) {
        this.timeSpentMinutes = timeSpentMinutes;
    }

    public Map<String, List<String>> getReactions() {
        return reactions;
    }

    public void setReactions(Map<String, List<String>> reactions) {
        this.reactions = reactions;
    }

    public CommentAttachment getAttachment() {
        return attachment;
    }

    public void setAttachment(CommentAttachment attachment) {
        this.attachment = attachment;
    }
}
