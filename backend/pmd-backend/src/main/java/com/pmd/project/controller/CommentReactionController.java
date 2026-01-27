package com.pmd.project.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.project.dto.ProjectCommentItemResponse;
import com.pmd.project.dto.ProjectCommentReactionRequest;
import com.pmd.project.service.ProjectCommentService;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/comments")
public class CommentReactionController {

    private final ProjectCommentService commentService;
    private final UserService userService;

    public CommentReactionController(ProjectCommentService commentService, UserService userService) {
        this.commentService = commentService;
        this.userService = userService;
    }

    @PostMapping("/{commentId}/reactions")
    public ProjectCommentItemResponse toggleReaction(
        @PathVariable String commentId,
        @Valid @RequestBody ProjectCommentReactionRequest request,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        return commentService.toggleReaction(commentId, request, requester);
    }

    @DeleteMapping("/{commentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteComment(@PathVariable String commentId, Authentication authentication) {
        User requester = getRequester(authentication);
        commentService.deleteComment(commentId, requester);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
