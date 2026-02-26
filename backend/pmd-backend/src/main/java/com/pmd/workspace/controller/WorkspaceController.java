package com.pmd.workspace.controller;

import com.pmd.audit.dto.WorkspaceAuditEventResponse;
import com.pmd.audit.service.WorkspaceAuditService;
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
import com.pmd.workspace.dto.WorkspaceMemberRoleUpdateRequest;
import com.pmd.workspace.dto.WorkspaceRoleRequest;
import com.pmd.workspace.dto.WorkspaceRoleResponse;
import com.pmd.workspace.dto.WorkspaceResponse;
import com.pmd.workspace.dto.WorkspaceSettingsRequest;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.model.WorkspaceRolePermissions;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces")
public class WorkspaceController {

    private final WorkspaceService workspaceService;
    private final UserService userService;
    private final WorkspaceAuditService workspaceAuditService;

    public WorkspaceController(WorkspaceService workspaceService, UserService userService,
                               WorkspaceAuditService workspaceAuditService) {
        this.workspaceService = workspaceService;
        this.userService = userService;
        this.workspaceAuditService = workspaceAuditService;
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
        WorkspaceMembership membership = workspaceService.createWorkspace(
            request.getName(),
            request.getInitialTeams(),
            requester
        );
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            membership.workspace().getId(),
            "WORKSPACE",
            "CREATE",
            "SUCCESS",
            requester,
            null,
            null,
            null,
            null,
            "WORKSPACE",
            membership.workspace().getId(),
            membership.workspace().getName(),
            "Workspace created"
        ));
        return toResponse(membership);
    }

    @PostMapping("/join")
    public WorkspaceResponse joinWorkspace(@Valid @RequestBody WorkspaceJoinRequest request,
                                           Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceMembership membership = workspaceService.joinWorkspace(request.getToken(), request.getInviteAnswer(), requester);
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            membership.workspace().getId(),
            "MEMBERSHIP",
            "JOIN",
            "SUCCESS",
            requester,
            requester.getId(),
            null,
            null,
            null,
            "WORKSPACE_MEMBER",
            requester.getId(),
            requester.getDisplayName(),
            "Joined workspace"
        ));
        return toResponse(membership);
    }

    @PostMapping("/{id}/invites")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceInviteResponse createInvite(@PathVariable String id,
                                                @RequestBody WorkspaceInviteCreateRequest request,
                                                Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceInvite invite = workspaceService.createInvite(
            id,
            requester,
            request.getExpiresAt(),
            request.getMaxUses(),
            request.getDefaultRoleId(),
            request.getInvitedEmail(),
            request.getJoinQuestion()
        );
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "INVITE",
            "CREATE",
            "SUCCESS",
            requester,
            null,
            null,
            null,
            null,
            "INVITE",
            invite.getId(),
            invite.getCode(),
            "Created workspace invite"
        ));
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
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "INVITE",
            "REVOKE",
            "SUCCESS",
            requester,
            null,
            null,
            null,
            null,
            "INVITE",
            invite.getId(),
            invite.getCode(),
            "Revoked workspace invite"
        ));
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
            invite.getJoinQuestion(),
            invite.getDefaultRoleId(),
            invite.getExpiresAt(),
            invite.getMaxUses(),
            invite.getUsesCount(),
            invite.isRevoked()
        );
    }

    @GetMapping("/{id}/roles")
    public List<WorkspaceRoleResponse> listRoles(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        return workspaceService.listRoles(id, requester).stream()
            .map(this::toRoleResponse)
            .toList();
    }

    @PostMapping("/{id}/roles")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkspaceRoleResponse createRole(@PathVariable String id,
                                            @Valid @RequestBody WorkspaceRoleRequest request,
                                            Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceRole role = workspaceService.createRole(id, request.getName(), request.getPermissions(), requester);
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "ROLE",
            "CREATE",
            "SUCCESS",
            requester,
            null,
            null,
            role.getId(),
            null,
            "ROLE",
            role.getId(),
            role.getName(),
            "Created workspace role"
        ));
        return toRoleResponse(role);
    }

    @PatchMapping("/{id}/roles/{roleId}")
    public WorkspaceRoleResponse updateRole(@PathVariable String id,
                                            @PathVariable String roleId,
                                            @RequestBody WorkspaceRoleRequest request,
                                            Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceRole role = workspaceService.updateRole(id, roleId, request.getName(), request.getPermissions(), requester);
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "ROLE",
            "UPDATE",
            "SUCCESS",
            requester,
            null,
            null,
            role.getId(),
            null,
            "ROLE",
            role.getId(),
            role.getName(),
            "Updated workspace role"
        ));
        return toRoleResponse(role);
    }

    @PostMapping("/{id}/members/{userId}/role")
    public WorkspaceResponse updateMemberRole(@PathVariable String id,
                                              @PathVariable String userId,
                                              @Valid @RequestBody WorkspaceMemberRoleUpdateRequest request,
                                              Authentication authentication) {
        User requester = getRequester(authentication);
        var member = workspaceService.assignMemberRole(id, userId, request.getRoleId(), requester);
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "MEMBERSHIP",
            "ASSIGN_ROLE",
            "SUCCESS",
            requester,
            userId,
            null,
            request.getRoleId(),
            null,
            "WORKSPACE_MEMBER",
            userId,
            member.getDisplayRoleName(),
            "Assigned role to workspace member"
        ));
        var workspace = workspaceService.getWorkspaceById(id);
        return toResponse(new WorkspaceMembership(workspace, member));
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
        WorkspaceJoinRequestResponse response = toJoinRequestResponse(workspaceService.approveRequest(id, requestId, requester));
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "REQUEST",
            "APPROVE",
            "SUCCESS",
            requester,
            response.getUserId(),
            null,
            null,
            null,
            "JOIN_REQUEST",
            response.getId(),
            response.getUserName(),
            "Approved workspace join request"
        ));
        return response;
    }

    @PostMapping("/{id}/requests/{requestId}/deny")
    public WorkspaceJoinRequestResponse denyRequest(@PathVariable String id,
                                                    @PathVariable String requestId,
                                                    Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceJoinRequestResponse response = toJoinRequestResponse(workspaceService.denyRequest(id, requestId, requester));
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "REQUEST",
            "DENY",
            "SUCCESS",
            requester,
            response.getUserId(),
            null,
            null,
            null,
            "JOIN_REQUEST",
            response.getId(),
            response.getUserName(),
            "Denied workspace join request"
        ));
        return response;
    }

    @PostMapping("/{id}/requests/self/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelOwnRequest(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.cancelOwnJoinRequest(id, requester);
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "REQUEST",
            "CANCEL",
            "SUCCESS",
            requester,
            requester != null ? requester.getId() : null,
            null,
            null,
            null,
            "JOIN_REQUEST",
            null,
            requester != null ? requester.getDisplayName() : "User",
            "Canceled own workspace join request"
        ));
    }

    @PatchMapping("/{id}/settings")
    public WorkspaceResponse updateSettings(@PathVariable String id,
                                            @RequestBody WorkspaceSettingsRequest request,
                                            Authentication authentication) {
        User requester = getRequester(authentication);
        WorkspaceMembership membership = workspaceService.updateSettings(
            id,
            request.getRequireApproval(),
            request.getName(),
            request.getSlug(),
            request.getDescription(),
            request.getLanguage(),
            request.getAvatarUrl(),
            request.getMaxProjects(),
            request.getMaxMembers(),
            request.getMaxTeams(),
            request.getMaxStorageMb(),
            requester
        );
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "WORKSPACE",
            "UPDATE_SETTINGS",
            "SUCCESS",
            requester,
            null,
            null,
            null,
            null,
            "WORKSPACE",
            id,
            membership.workspace().getName(),
            "Updated workspace settings"
        ));
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
        workspaceAuditService.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
            id,
            "WORKSPACE",
            "RESET_DEMO",
            "SUCCESS",
            requester,
            null,
            null,
            null,
            null,
            "WORKSPACE",
            id,
            null,
            "Reset demo workspace data"
        ));
    }

    @GetMapping("/{id}/audit")
    public List<WorkspaceAuditEventResponse> listAudit(@PathVariable String id,
                                                       @RequestParam(required = false) Boolean personalOnly,
                                                       @RequestParam(required = false) String actorUserId,
                                                       @RequestParam(required = false) String targetUserId,
                                                       @RequestParam(required = false) String teamId,
                                                       @RequestParam(required = false) String roleId,
                                                       @RequestParam(required = false) String projectId,
                                                       @RequestParam(required = false) String category,
                                                       @RequestParam(required = false) String action,
                                                       @RequestParam(required = false) String from,
                                                       @RequestParam(required = false) String to,
                                                       @RequestParam(required = false) String q,
                                                       @RequestParam(required = false) Integer limit,
                                                       Authentication authentication) {
        User requester = getRequester(authentication);
        return workspaceAuditService.list(id, new WorkspaceAuditService.WorkspaceAuditQuery(
            personalOnly,
            actorUserId,
            targetUserId,
            teamId,
            roleId,
            projectId,
            category,
            action,
            from,
            to,
            q,
            limit
        ), requester);
    }

    private WorkspaceResponse toResponse(WorkspaceMembership membership) {
        WorkspaceRolePermissions permissions = workspaceService.resolveMemberPermissions(
            membership.workspace().getId(),
            membership.member()
        );
        String roleName = membership.member().getDisplayRoleName();
        if (roleName == null && membership.member().getRole() != null) {
            roleName = switch (membership.member().getRole()) {
                case OWNER -> "Owner";
                case ADMIN -> "Manager";
                case MEMBER -> "Member";
            };
        }
        return new WorkspaceResponse(
            membership.workspace().getId(),
            membership.workspace().getName(),
            membership.workspace().getSlug(),
            membership.member().getRole(),
            membership.member().getRoleId(),
            roleName,
            permissions,
            membership.member().getStatus(),
            membership.workspace().getCreatedAt(),
            membership.workspace().isDemo(),
            membership.workspace().isRequireApproval(),
            membership.workspace().getDescription(),
            membership.workspace().getLanguage(),
            membership.workspace().getAvatarUrl(),
            membership.workspace().getMaxProjects(),
            membership.workspace().getMaxMembers(),
            membership.workspace().getMaxTeams(),
            membership.workspace().getMaxStorageMb()
        );
    }

    private WorkspaceInviteResponse toInviteResponse(WorkspaceInvite invite) {
        return new WorkspaceInviteResponse(
            invite.getId(),
            invite.getWorkspaceId(),
            invite.getToken(),
            invite.getCode(),
            invite.getInvitedEmail(),
            invite.getJoinQuestion(),
            invite.getDefaultRoleId(),
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
            request.getInviteQuestion(),
            request.getInviteAnswer(),
            request.getStatus(),
            request.getCreatedAt()
        );
    }

    private WorkspaceRoleResponse toRoleResponse(WorkspaceRole role) {
        return new WorkspaceRoleResponse(
            role.getId(),
            role.getWorkspaceId(),
            role.getName(),
            role.isSystem(),
            role.getPermissions(),
            role.getCreatedAt()
        );
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
