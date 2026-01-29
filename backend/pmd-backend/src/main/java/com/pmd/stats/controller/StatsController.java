package com.pmd.stats.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.stats.dto.PeopleOverviewStatsResponse;
import com.pmd.stats.dto.PeopleUserStatsResponse;
import com.pmd.stats.dto.UserStatsResponse;
import com.pmd.stats.dto.WorkspaceDashboardStatsResponse;
import com.pmd.stats.service.StatsService;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.service.WorkspaceService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/stats")
public class StatsController {

    private final StatsService statsService;
    private final UserService userService;
    private final WorkspaceService workspaceService;

    public StatsController(StatsService statsService, UserService userService, WorkspaceService workspaceService) {
        this.statsService = statsService;
        this.userService = userService;
        this.workspaceService = workspaceService;
    }

    @GetMapping("/dashboard")
    public WorkspaceDashboardStatsResponse dashboard(@PathVariable String workspaceId,
                                                     @RequestParam(value = "teams", required = false) List<String> teams,
                                                     @RequestParam(value = "assignedToMe", required = false, defaultValue = "false")
                                                     boolean assignedToMe,
                                                     Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return statsService.getWorkspaceDashboardStats(workspaceId, requester, teams, assignedToMe);
    }

    @GetMapping("/user/me")
    public UserStatsResponse myStats(@PathVariable String workspaceId, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return statsService.getUserStats(workspaceId, requester, requester);
    }

    @GetMapping("/user/{id}")
    public UserStatsResponse userStats(@PathVariable String workspaceId, @PathVariable String id,
                                       Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        User target = userService.findById(id);
        return statsService.getUserStats(workspaceId, requester, target);
    }

    @GetMapping("/people/overview")
    public PeopleOverviewStatsResponse peopleOverview(@PathVariable String workspaceId, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return statsService.getPeopleOverview(workspaceId, requester);
    }

    @GetMapping("/people/{id}")
    public PeopleUserStatsResponse peopleUser(@PathVariable String workspaceId, @PathVariable String id,
                                              Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        User target = userService.findById(id);
        return statsService.getPeopleUserStats(workspaceId, requester, target);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
