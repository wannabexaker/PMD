package com.pmd.user.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.team.model.Team;
import com.pmd.user.dto.UserIdentityBadgeResponse;
import com.pmd.team.service.TeamService;
import com.pmd.user.dto.UserSummaryResponse;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import com.pmd.workspace.service.WorkspaceService;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.Objects;
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
        WorkspaceMember requesterMembership = workspaceService.requireActiveMembership(workspaceId, requester);
        WorkspaceRolePermissions requesterPermissions = workspaceService.resolveMemberPermissions(workspaceId, requesterMembership);
        boolean canViewFullEmails = requester.isAdmin()
            || (requesterPermissions != null && requesterPermissions.allows(WorkspacePermission.MANAGE_WORKSPACE_SETTINGS));
        boolean includeAdmins = userService.isAdmin(requester);
        List<User> users = userService.findAssignableUsers(workspaceId, query, teamId, includeAdmins);
        java.util.Map<String, Long> activeCounts = userService.findActiveProjectCounts(
            workspaceId,
            users,
            includeAdmins
        );
        List<Team> workspaceTeams = teamService.findActiveTeams(workspaceId);
        Map<String, Team> teamsById = workspaceTeams.stream()
            .collect(Collectors.toMap(Team::getId, team -> team));
        Map<String, UserService.WorkspaceRoleDisplay> roleDisplays =
            userService.findWorkspaceRoleDisplays(workspaceId, users);
        Map<String, List<UserService.WorkspaceRoleBadgeEntry>> roleEntriesByUser =
            userService.findWorkspaceRoleBadgeEntries(workspaceId, users);
        return users.stream()
            .map(user -> toSummary(user,
                activeCounts.getOrDefault(user.getId(), 0L),
                requester,
                teamsById,
                roleDisplays.get(user.getId()),
                roleEntriesByUser.getOrDefault(user.getId(), List.of()),
                canViewFullEmails))
            .toList();
    }

    private UserSummaryResponse toSummary(User user, long activeProjectCount, User requester,
                                          Map<String, Team> teamsById,
                                          UserService.WorkspaceRoleDisplay roleDisplay,
                                          List<UserService.WorkspaceRoleBadgeEntry> roleEntries,
                                          boolean canViewFullEmails) {
        String roleName = roleDisplay != null ? roleDisplay.roleName() : null;
        String roleBadgeLabel = roleDisplay != null ? roleDisplay.roleBadgeLabel() : roleName;
        String roleBadgeColor = roleDisplay != null ? roleDisplay.roleBadgeColor() : null;
        boolean recommendedByMe = requester.getId() != null
            && user.getRecommendedByUserIds() != null
            && user.getRecommendedByUserIds().contains(requester.getId());
        String teamId = resolveWorkspaceTeamId(user, teamsById);
        String teamName = teamId != null ? teamsById.get(teamId).getName() : null;
        boolean isSelf = requester.getId() != null && requester.getId().equals(user.getId());
        String email = canViewFullEmails || isSelf ? user.getEmail() : maskEmail(user.getEmail());
        UserSummaryResponse summary = new UserSummaryResponse(
            user.getId(),
            user.getDisplayName(),
            email,
            teamName,
            teamId,
            teamName,
            roleName,
            roleBadgeLabel,
            roleBadgeColor,
            user.isAdmin(),
            activeProjectCount,
            user.getRecommendedCount(),
            recommendedByMe
        );
        summary.setTeamBadges(buildTeamBadges(user, teamsById));
        summary.setRoleBadges(buildRoleBadges(roleEntries));
        return summary;
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    private List<UserIdentityBadgeResponse> buildTeamBadges(User user, Map<String, Team> teamsById) {
        List<String> orderedTeamIds = new ArrayList<>();
        String primaryTeamId = user.getTeamId() != null ? user.getTeamId().trim() : "";
        if (!primaryTeamId.isBlank()) {
            orderedTeamIds.add(primaryTeamId);
        }
        if (user.getTeamIds() != null) {
            user.getTeamIds().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .filter(value -> !orderedTeamIds.contains(value))
                .forEach(orderedTeamIds::add);
        }
        List<UserIdentityBadgeResponse> badges = new ArrayList<>();
        for (int i = 0; i < orderedTeamIds.size(); i += 1) {
            Team team = teamsById.get(orderedTeamIds.get(i));
            if (team == null) {
                continue;
            }
            badges.add(new UserIdentityBadgeResponse(
                team.getId(),
                team.getName(),
                team.getColor(),
                i
            ));
        }
        return badges;
    }

    private List<UserIdentityBadgeResponse> buildRoleBadges(List<UserService.WorkspaceRoleBadgeEntry> roleEntries) {
        if (roleEntries == null || roleEntries.isEmpty()) {
            return List.of();
        }
        List<UserIdentityBadgeResponse> badges = new ArrayList<>();
        for (int i = 0; i < roleEntries.size(); i += 1) {
            UserService.WorkspaceRoleBadgeEntry entry = roleEntries.get(i);
            badges.add(new UserIdentityBadgeResponse(
                entry.roleId(),
                entry.roleBadgeLabel(),
                entry.roleBadgeColor(),
                i
            ));
        }
        return badges;
    }

    private String resolveWorkspaceTeamId(User user, Map<String, Team> teamsById) {
        if (user == null) {
            return null;
        }
        if (user.getTeamId() != null && teamsById.containsKey(user.getTeamId())) {
            return user.getTeamId();
        }
        if (user.getTeamIds() != null) {
            for (String teamId : user.getTeamIds()) {
                if (teamId != null && teamsById.containsKey(teamId)) {
                    return teamId;
                }
            }
        }
        return null;
    }

    private String maskEmail(String email) {
        if (email == null || email.isBlank()) {
            return email;
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        String local = email.substring(0, at);
        String domain = email.substring(at + 1);
        String localMasked = local.length() <= 2
            ? local.charAt(0) + "*"
            : local.charAt(0) + "***" + local.charAt(local.length() - 1);
        int dot = domain.indexOf('.');
        if (dot <= 1) {
            return localMasked + "@***";
        }
        String domainPrefix = domain.substring(0, dot);
        String tld = domain.substring(dot);
        String domainMasked = domainPrefix.length() <= 2
            ? domainPrefix.charAt(0) + "*"
            : domainPrefix.charAt(0) + "***" + domainPrefix.charAt(domainPrefix.length() - 1);
        return localMasked + "@" + domainMasked + tld;
    }
}
