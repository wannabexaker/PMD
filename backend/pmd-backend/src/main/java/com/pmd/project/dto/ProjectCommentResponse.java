package com.pmd.project.dto;

import java.time.Instant;

public class ProjectCommentResponse {

    private String commentId;

    private String authorId;

    private String message;

    private int timeSpentMinutes;

    private Instant createdAt;

    public ProjectCommentResponse() {
    }

    public ProjectCommentResponse(String commentId, String authorId, String message, int timeSpentMinutes,
                                  Instant createdAt) {
        this.commentId = commentId;
        this.authorId = authorId;
        this.message = message;
        this.timeSpentMinutes = timeSpentMinutes;
        this.createdAt = createdAt;
    }

    public String getCommentId() {
        return commentId;
    }

    public void setCommentId(String commentId) {
        this.commentId = commentId;
    }

    public String getAuthorId() {
        return authorId;
    }

    public void setAuthorId(String authorId) {
        this.authorId = authorId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getTimeSpentMinutes() {
        return timeSpentMinutes;
    }

    public void setTimeSpentMinutes(int timeSpentMinutes) {
        this.timeSpentMinutes = timeSpentMinutes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}