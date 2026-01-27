package com.pmd.project.dto;

import com.pmd.project.model.CommentReactionType;
import jakarta.validation.constraints.NotNull;

public class ProjectCommentReactionRequest {

    @NotNull
    private CommentReactionType type;

    public ProjectCommentReactionRequest() {
    }

    public ProjectCommentReactionRequest(CommentReactionType type) {
        this.type = type;
    }

    public CommentReactionType getType() {
        return type;
    }

    public void setType(CommentReactionType type) {
        this.type = type;
    }
}
