package com.pmd.project.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class ProjectCommentRequest {

    @NotBlank
    private String authorId;

    @NotBlank
    private String message;

    @Min(0)
    private int timeSpentMinutes;

    public ProjectCommentRequest() {
    }

    public ProjectCommentRequest(String authorId, String message, int timeSpentMinutes) {
        this.authorId = authorId;
        this.message = message;
        this.timeSpentMinutes = timeSpentMinutes;
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
}