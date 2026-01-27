package com.pmd.project.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public class ProjectCommentItemResponse {

    private String id;

    private String projectId;

    private String authorUserId;

    private String authorName;

    private String message;

    private Instant createdAt;

    private Integer timeSpentMinutes;

    private Map<String, List<String>> reactions;

    private CommentAttachmentResponse attachment;

    public ProjectCommentItemResponse() {
    }

    public ProjectCommentItemResponse(String id, String projectId, String authorUserId, String authorName,
                                      String message, Instant createdAt, Integer timeSpentMinutes,
                                      Map<String, List<String>> reactions, CommentAttachmentResponse attachment) {
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

    public CommentAttachmentResponse getAttachment() {
        return attachment;
    }

    public void setAttachment(CommentAttachmentResponse attachment) {
        this.attachment = attachment;
    }
}
