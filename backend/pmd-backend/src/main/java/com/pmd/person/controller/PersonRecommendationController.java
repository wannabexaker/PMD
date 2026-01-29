package com.pmd.person.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.person.dto.RecommendationToggleResponse;
import com.pmd.team.model.Team;
import com.pmd.team.service.TeamService;
import com.pmd.user.dto.UserSummaryResponse;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.service.WorkspaceService;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/people")
public class PersonRecommendationController {

    private final UserService userService;
    private final TeamService teamService;
    private final WorkspaceService workspaceService;

    public PersonRecommendationController(UserService userService,
                                          TeamService teamService, WorkspaceService workspaceService) {
        this.userService = userService;
        this.teamService = teamService;
        this.workspaceService = workspaceService;
    }

    @PostMapping("/{personId}/recommendations/toggle")
    public RecommendationToggleResponse toggleRecommendation(
        @PathVariable String workspaceId,
        @PathVariable String personId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        if (Objects.equals(requester.getId(), personId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot recommend yourself");
        }
        User target = requireWorkspaceUser(workspaceId, personId, true);
        List<String> current = target.getRecommendedByUserIds() != null
            ? new ArrayList<>(target.getRecommendedByUserIds())
            : new ArrayList<>();
        Set<String> next = current.stream()
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (requester.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (next.contains(requester.getId())) {
            next.remove(requester.getId());
        } else {
            next.add(requester.getId());
        }
        target.setRecommendedByUserIds(new ArrayList<>(next));
        target.setRecommendedCount(next.size());
        userService.save(target);
        boolean recommendedByMe = next.contains(requester.getId());
        return new RecommendationToggleResponse(target.getId(), target.getRecommendedCount(), recommendedByMe);
    }

    @GetMapping("/recommended")
    public List<UserSummaryResponse> recommendedPeople(
        @PathVariable String workspaceId,
        @RequestParam(name = "teamId", required = false) String teamId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        boolean includeAdmins = userService.isAdmin(requester);
        List<User> users = userService.findAssignableUsers(workspaceId, null, teamId, includeAdmins).stream()
            .filter(user -> user.getRecommendedCount() > 0)
            .sorted(Comparator
                .comparingInt(User::getRecommendedCount)
                .reversed()
                .thenComparing(user -> user.getDisplayName() != null ? user.getDisplayName() : ""))
            .toList();
        var activeCounts = userService.findActiveProjectCounts(workspaceId, users, includeAdmins);
        var teamNames = teamService.findActiveTeams(workspaceId).stream()
            .collect(Collectors.toMap(Team::getId, Team::getName));
        return users.stream()
            .map(user -> toSummary(user, activeCounts.getOrDefault(user.getId(), 0L), requester, teamNames))
            .toList();
    }

    @GetMapping("/{personId}/recommendations")
    public List<UserSummaryResponse> recommendationDetails(
        @PathVariable String workspaceId,
        @PathVariable String personId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        boolean includeAdmins = userService.isAdmin(requester);
        User target = requireWorkspaceUser(workspaceId, personId, includeAdmins);
        List<String> recommenderIds = target.getRecommendedByUserIds() != null
            ? target.getRecommendedByUserIds()
            : List.of();
        if (recommenderIds.isEmpty()) {
            return List.of();
        }
        List<User> workspaceUsers = userService.listUsersForWorkspace(workspaceId, includeAdmins);
        List<User> recommenders = workspaceUsers.stream()
            .filter(user -> recommenderIds.contains(user.getId()))
            .filter(user -> includeAdmins || !userService.isAdminTeam(user))
            .toList();
        var activeCounts = userService.findActiveProjectCounts(workspaceId, recommenders, includeAdmins);
        var teamNames = teamService.findActiveTeams(workspaceId).stream()
            .collect(Collectors.toMap(Team::getId, Team::getName));
        return recommenders.stream()
            .map(user -> toSummary(user, activeCounts.getOrDefault(user.getId(), 0L), requester, teamNames))
            .toList();
    }

    private UserSummaryResponse toSummary(User user, long activeProjectCount, User requester,
                                          java.util.Map<String, String> teamNames) {
        boolean recommendedByMe = requester.getId() != null
            && user.getRecommendedByUserIds() != null
            && user.getRecommendedByUserIds().contains(requester.getId());
        String teamName = resolveTeamName(user, teamNames);
        return new UserSummaryResponse(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            teamName,
            user.getTeamId(),
            teamName,
            userService.isAdminTeam(user),
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

    private String resolveTeamName(User user, java.util.Map<String, String> teamNames) {
        if (user == null) {
            return null;
        }
        if (user.getTeamId() != null && teamNames.containsKey(user.getTeamId())) {
            return teamNames.get(user.getTeamId());
        }
        return user.getTeam();
    }

    private User requireWorkspaceUser(String workspaceId, String userId, boolean includeAdmins) {
        if (userId == null || userId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
        return userService.listUsersForWorkspace(workspaceId, includeAdmins).stream()
            .filter(user -> userId.equals(user.getId()))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
}
