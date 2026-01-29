package com.pmd.team.controller;

import com.pmd.auth.policy.AccessPolicy;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.team.dto.TeamRequest;
import com.pmd.team.dto.TeamResponse;
import com.pmd.team.dto.TeamUpdateRequest;
import com.pmd.team.model.Team;
import com.pmd.team.service.TeamService;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/teams")
public class TeamController {

    private final TeamService teamService;
    private final UserService userService;
    private final AccessPolicy accessPolicy;
    private final WorkspaceService workspaceService;

    public TeamController(TeamService teamService, UserService userService, AccessPolicy accessPolicy,
                          WorkspaceService workspaceService) {
        this.teamService = teamService;
        this.userService = userService;
        this.accessPolicy = accessPolicy;
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public List<TeamResponse> listTeams(@PathVariable String workspaceId, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return teamService.findActiveTeams(workspaceId).stream()
            .map(this::toResponse)
            .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TeamResponse createTeam(@PathVariable String workspaceId,
                                   @Valid @RequestBody TeamRequest request,
                                   Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        Team team = teamService.createTeam(request, requester, workspaceId);
        return toResponse(team);
    }

    @PatchMapping("/{id}")
    public TeamResponse updateTeam(@PathVariable String workspaceId,
                                   @PathVariable String id,
                                   @RequestBody TeamUpdateRequest request,
                                   Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        Team team = teamService.updateTeam(workspaceId, id, request.getName(), request.getIsActive());
        return toResponse(team);
    }

    private TeamResponse toResponse(Team team) {
        return new TeamResponse(
            team.getId(),
            team.getName(),
            team.getSlug(),
            team.getWorkspaceId(),
            team.isActive(),
            team.getCreatedAt(),
            team.getCreatedBy()
        );
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
