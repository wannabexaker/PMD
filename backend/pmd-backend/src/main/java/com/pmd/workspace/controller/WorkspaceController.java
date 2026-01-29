package com.pmd.workspace.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.dto.WorkspaceCreateRequest;
import com.pmd.workspace.dto.WorkspaceJoinRequest;
import com.pmd.workspace.dto.WorkspaceResponse;
import com.pmd.workspace.service.WorkspaceService;
import com.pmd.workspace.service.WorkspaceService.WorkspaceMembership;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final UserService userService;

    public WorkspaceController(WorkspaceService workspaceService, UserService userService) {
        this.workspaceService = workspaceService;
        this.userService = userService;
    }

    @GetMapping
    public List<WorkspaceResponse> listWorkspaces(Authentication authentication) {
        User requester = getRequester(authentication);
        return workspaceService.listWorkspacesFor(requester).stream()
            .map(this::toResponse)
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceResponse createWorkspace(@Valid @RequestBody WorkspaceCreateRequest request,
                                             Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceMembership membership = workspaceService.createWorkspace(request.getName(), requester);
        return toResponse(membership);
    }

    @PostMapping("/join")
    public WorkspaceResponse joinWorkspace(@Valid @RequestBody WorkspaceJoinRequest request,
                                           Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceMembership membership = workspaceService.joinWorkspace(request.getToken(), requester);
        return toResponse(membership);
    }

    @PostMapping("/demo")
    public WorkspaceResponse demoWorkspace(Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceMembership membership = workspaceService.getOrCreateDemoWorkspace(requester);
        return toResponse(membership);
    }

    @PostMapping("/{id}/demo/reset")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetDemoWorkspace(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.resetDemoWorkspace(id, requester);
    }

    private WorkspaceResponse toResponse(WorkspaceMembership membership) {
        return new WorkspaceResponse(
            membership.workspace().getId(),
            membership.workspace().getName(),
            membership.workspace().getSlug(),
            membership.member().getRole(),
            membership.member().getStatus(),
            membership.workspace().getCreatedAt(),
            membership.workspace().isDemo()
        );
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
