package com.pmd.user.controller;

import com.pmd.user.dto.UserSummaryResponse;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<UserSummaryResponse> findUsers(
        @RequestParam(name = "q", required = false) String query,
        @RequestParam(name = "team", required = false) String team,
        Authentication authentication
    ) {
        boolean includeAdmins = userService.isAdmin(authentication);
        List<User> users = userService.findAssignableUsers(query, team, includeAdmins);
        java.util.Map<String, Long> activeCounts = userService.findActiveProjectCounts(users, includeAdmins);
        return users.stream()
            .map(user -> toSummary(user, activeCounts.getOrDefault(user.getId(), 0L)))
            .toList();
    }

    private UserSummaryResponse toSummary(User user, long activeProjectCount) {
        return new UserSummaryResponse(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            user.getTeam(),
            userService.isAdminTeam(user),
            activeProjectCount
        );
    }
}
