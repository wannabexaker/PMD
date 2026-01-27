package com.pmd.project.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public class ProjectCommentCreateRequest {

    @NotBlank
    private String message;

    @Min(1)
    @Max(1440)
    private Integer timeSpentMinutes;

    private CommentAttachmentResponse attachment;

    public ProjectCommentCreateRequest() {
    }

    public ProjectCommentCreateRequest(String message, Integer timeSpentMinutes, CommentAttachmentResponse attachment) {
        this.message = message;
        this.timeSpentMinutes = timeSpentMinutes;
        this.attachment = attachment;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Integer getTimeSpentMinutes() {
        return timeSpentMinutes;
    }

    public void setTimeSpentMinutes(Integer timeSpentMinutes) {
        this.timeSpentMinutes = timeSpentMinutes;
    }

    public CommentAttachmentResponse getAttachment() {
        return attachment;
    }

    public void setAttachment(CommentAttachmentResponse attachment) {
        this.attachment = attachment;
    }
}
