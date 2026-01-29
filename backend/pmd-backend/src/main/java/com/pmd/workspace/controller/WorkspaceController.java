package com.pmd.workspace.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.dto.WorkspaceCreateRequest;
import com.pmd.workspace.dto.WorkspaceInviteCreateRequest;
import com.pmd.workspace.dto.WorkspaceInviteResolveRequest;
import com.pmd.workspace.dto.WorkspaceInviteResolveResponse;
import com.pmd.workspace.dto.WorkspaceInviteResponse;
import com.pmd.workspace.dto.WorkspaceJoinRequest;
import com.pmd.workspace.dto.WorkspaceJoinRequestResponse;
import com.pmd.workspace.dto.WorkspaceResponse;
import com.pmd.workspace.dto.WorkspaceSettingsRequest;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.service.WorkspaceService;
import com.pmd.workspace.service.WorkspaceService.WorkspaceMembership;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
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

    @PostMapping("/{id}/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceInviteResponse createInvite(@PathVariable String id,
                                                @RequestBody WorkspaceInviteCreateRequest request,
                                                Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceInvite invite = workspaceService.createInvite(id, requester, request.getExpiresAt(), request.getMaxUses());
        return toInviteResponse(invite);
    }

    @GetMapping("/{id}/invites")
    public List<WorkspaceInviteResponse> listInvites(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        return workspaceService.listInvites(id, requester).stream()
            .map(this::toInviteResponse)
            .toList();
    }

    @PostMapping("/{id}/invites/{inviteId}/revoke")
    public WorkspaceInviteResponse revokeInvite(@PathVariable String id,
                                                @PathVariable String inviteId,
                                                Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceInvite invite = workspaceService.revokeInvite(id, inviteId, requester);
        return toInviteResponse(invite);
    }

    @PostMapping("/invites/resolve")
    public WorkspaceInviteResolveResponse resolveInvite(@Valid @RequestBody WorkspaceInviteResolveRequest request) {
        WorkspaceInvite invite = workspaceService.resolveInvite(request.getInvite());
        String workspaceName = workspaceService.findWorkspaceName(invite.getWorkspaceId());
        return new WorkspaceInviteResolveResponse(
            invite.getWorkspaceId(),
            workspaceName,
            invite.getToken(),
            invite.getCode(),
            invite.getExpiresAt(),
            invite.getMaxUses(),
            invite.getUsesCount(),
            invite.isRevoked()
        );
    }

    @GetMapping("/{id}/requests")
    public List<WorkspaceJoinRequestResponse> listPendingRequests(@PathVariable String id,
                                                                  Authentication authentication) {
        User requester = getRequester(authentication);
        return workspaceService.listPendingRequests(id, requester).stream()
            .map(this::toJoinRequestResponse)
            .toList();
    }

    @PostMapping("/{id}/requests/{requestId}/approve")
    public WorkspaceJoinRequestResponse approveRequest(@PathVariable String id,
                                                       @PathVariable String requestId,
                                                       Authentication authentication) {
        User requester = getRequester(authentication);
        return toJoinRequestResponse(workspaceService.approveRequest(id, requestId, requester));
    }

    @PostMapping("/{id}/requests/{requestId}/deny")
    public WorkspaceJoinRequestResponse denyRequest(@PathVariable String id,
                                                    @PathVariable String requestId,
                                                    Authentication authentication) {
        User requester = getRequester(authentication);
        return toJoinRequestResponse(workspaceService.denyRequest(id, requestId, requester));
    }

    @PatchMapping("/{id}/settings")
    public WorkspaceResponse updateSettings(@PathVariable String id,
                                            @RequestBody WorkspaceSettingsRequest request,
                                            Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceMembership membership = workspaceService.updateSettings(id, request.getRequireApproval(), requester);
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
            membership.workspace().isDemo(),
            membership.workspace().isRequireApproval()
        );
    }

    private WorkspaceInviteResponse toInviteResponse(WorkspaceInvite invite) {
        return new WorkspaceInviteResponse(
            invite.getId(),
            invite.getWorkspaceId(),
            invite.getToken(),
            invite.getCode(),
            invite.getExpiresAt(),
            invite.getMaxUses(),
            invite.getUsesCount(),
            invite.isRevoked(),
            invite.getCreatedAt()
        );
    }

    private WorkspaceJoinRequestResponse toJoinRequestResponse(com.pmd.workspace.model.WorkspaceJoinRequest request) {
        User user = userService.findById(request.getUserId());
        return new WorkspaceJoinRequestResponse(
            request.getId(),
            request.getWorkspaceId(),
            request.getUserId(),
            user != null ? user.getDisplayName() : null,
            user != null ? user.getEmail() : null,
            request.getStatus(),
            request.getCreatedAt()
        );
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
