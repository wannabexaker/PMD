package com.pmd.project.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.project.dto.ProjectCommentCreateRequest;
import com.pmd.project.dto.ProjectCommentItemResponse;
import com.pmd.project.service.ProjectCommentService;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/projects/{projectId}/comments")
public class ProjectCommentController {

    private final ProjectCommentService commentService;
    private final UserService userService;

    public ProjectCommentController(ProjectCommentService commentService, UserService userService) {
        this.commentService = commentService;
        this.userService = userService;
    }

    @GetMapping
    public List<ProjectCommentItemResponse> list(
        @PathVariable String projectId,
        @RequestParam(name = "page", defaultValue = "0") int page,
        @RequestParam(name = "size", defaultValue = "50") int size,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        Page<ProjectCommentItemResponse> result = commentService.listComments(projectId, page, size, requester);
        return result.getContent();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectCommentItemResponse create(
        @PathVariable String projectId,
        @Valid @RequestBody ProjectCommentCreateRequest request,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        return commentService.addComment(projectId, request, requester);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
