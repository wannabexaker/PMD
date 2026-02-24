package com.pmd.user.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.team.model.Team;
import com.pmd.team.service.TeamService;
import com.pmd.user.dto.UserSummaryResponse;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.service.WorkspaceService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/users")
public class UserController {

    private final UserService userService;
    private final TeamService teamService;
    private final WorkspaceService workspaceService;

    public UserController(UserService userService, TeamService teamService, WorkspaceService workspaceService) {
        this.userService = userService;
        this.teamService = teamService;
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public List<UserSummaryResponse> findUsers(
        @PathVariable String workspaceId,
        @RequestParam(name = "q", required = false) String query,
        @RequestParam(name = "teamId", required = false) String teamId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        boolean includeAdmins = userService.isAdmin(requester);
        List<User> users = userService.findAssignableUsers(workspaceId, query, teamId, includeAdmins);
        java.util.Map<String, Long> activeCounts = userService.findActiveProjectCounts(
            workspaceId,
            users,
            includeAdmins
        );
        Map<String, String> teamNames = teamService.findActiveTeams(workspaceId).stream()
            .collect(Collectors.toMap(Team::getId, Team::getName));
        Map<String, String> roleNames = userService.findWorkspaceRoleNames(workspaceId, users);
        return users.stream()
            .map(user -> toSummary(user,
                activeCounts.getOrDefault(user.getId(), 0L),
                requester,
                teamNames,
                roleNames.get(user.getId())))
            .toList();
    }

    private UserSummaryResponse toSummary(User user, long activeProjectCount, User requester,
                                          Map<String, String> teamNames, String roleName) {
        boolean recommendedByMe = requester.getId() != null
            && user.getRecommendedByUserIds() != null
            && user.getRecommendedByUserIds().contains(requester.getId());
        String teamId = resolveWorkspaceTeamId(user, teamNames);
        String teamName = teamId != null ? teamNames.get(teamId) : null;
        return new UserSummaryResponse(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            teamName,
            teamId,
            teamName,
            roleName,
            user.isAdmin(),
            activeProjectCount,
            user.getRecommendedCount(),
            recommendedByMe
        );
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    private String resolveWorkspaceTeamId(User user, Map<String, String> teamNames) {
        if (user == null) {
            return null;
        }
        if (user.getTeamId() != null && teamNames.containsKey(user.getTeamId())) {
            return user.getTeamId();
        }
        return null;
    }
}
