package com.pmd.person.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.person.dto.RecommendationToggleResponse;
import com.pmd.user.dto.UserSummaryResponse;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
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
@RequestMapping("/api/people")
public class PersonRecommendationController {

    private final UserService userService;
    private final UserRepository userRepository;

    public PersonRecommendationController(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @PostMapping("/{personId}/recommendations/toggle")
    public RecommendationToggleResponse toggleRecommendation(
        @PathVariable String personId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        if (Objects.equals(requester.getId(), personId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot recommend yourself");
        }
        User target = userService.findById(personId);
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
        @RequestParam(name = "teamId", required = false) String teamId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        boolean includeAdmins = userService.isAdmin(requester);
        List<User> users = userService.findAssignableUsers(null, teamId, includeAdmins).stream()
            .filter(user -> user.getRecommendedCount() > 0)
            .sorted(Comparator
                .comparingInt(User::getRecommendedCount)
                .reversed()
                .thenComparing(user -> user.getDisplayName() != null ? user.getDisplayName() : ""))
            .toList();
        var activeCounts = userService.findActiveProjectCounts(users, includeAdmins);
        return users.stream()
            .map(user -> toSummary(user, activeCounts.getOrDefault(user.getId(), 0L), requester))
            .toList();
    }

    @GetMapping("/{personId}/recommendations")
    public List<UserSummaryResponse> recommendationDetails(
        @PathVariable String personId,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        boolean includeAdmins = userService.isAdmin(requester);
        User target = userService.findById(personId);
        List<String> recommenderIds = target.getRecommendedByUserIds() != null
            ? target.getRecommendedByUserIds()
            : List.of();
        if (recommenderIds.isEmpty()) {
            return List.of();
        }
        List<User> recommenders = userRepository.findAllById(recommenderIds).stream()
            .filter(user -> includeAdmins || !userService.isAdminTeam(user))
            .toList();
        var activeCounts = userService.findActiveProjectCounts(recommenders, includeAdmins);
        return recommenders.stream()
            .map(user -> toSummary(user, activeCounts.getOrDefault(user.getId(), 0L), requester))
            .toList();
    }

    private UserSummaryResponse toSummary(User user, long activeProjectCount, User requester) {
        boolean recommendedByMe = requester.getId() != null
            && user.getRecommendedByUserIds() != null
            && user.getRecommendedByUserIds().contains(requester.getId());
        return new UserSummaryResponse(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            user.getTeam(),
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
}

