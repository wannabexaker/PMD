package com.pmd.user.service;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.auth.policy.AccessPolicy;
import com.pmd.project.model.ProjectStatus;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.query.Criteria;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final AccessPolicy accessPolicy;
    private final MongoTemplate mongoTemplate;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceRoleRepository workspaceRoleRepository;

    public UserService(UserRepository userRepository, AccessPolicy accessPolicy, MongoTemplate mongoTemplate,
                       WorkspaceMemberRepository workspaceMemberRepository,
                       WorkspaceRoleRepository workspaceRoleRepository) {
        this.userRepository = userRepository;
        this.accessPolicy = accessPolicy;
        this.mongoTemplate = mongoTemplate;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceRoleRepository = workspaceRoleRepository;
    }

    public User findById(String id) {
        return userRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    public User findByUsername(String username) {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public long count() {
        return userRepository.count();
    }

    public User save(User user) {
        if (user.getId() != null) {
            User existing = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            if (existing.isAdmin() && !user.isAdmin()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role is immutable");
            }
        } else if (user.getEmail() != null) {
            userRepository.findByEmail(user.getEmail()).ifPresent(existing -> {
                if (existing.isAdmin() && !user.isAdmin()) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin role is immutable");
                }
            });
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(Instant.now());
        }
        if (user.getRecommendedByUserIds() == null) {
            user.setRecommendedByUserIds(new java.util.ArrayList<>());
        }
        List<String> normalizedTeamIds = normalizeIds(user.getTeamIds());
        String primaryTeamId = user.getTeamId() != null ? user.getTeamId().trim() : "";
        if (!primaryTeamId.isBlank()) {
            normalizedTeamIds.remove(primaryTeamId);
            normalizedTeamIds.add(0, primaryTeamId);
        } else if (!normalizedTeamIds.isEmpty()) {
            primaryTeamId = normalizedTeamIds.get(0);
        }
        user.setTeamIds(normalizedTeamIds);
        user.setTeamId(primaryTeamId.isBlank() ? null : primaryTeamId);
        user.setRecommendedCount(user.getRecommendedByUserIds().size());
        if (user.getPeoplePageWidgets() == null) {
            user.setPeoplePageWidgets(com.pmd.user.model.PeoplePageWidgets.defaults());
        } else {
            user.setPeoplePageWidgets(user.getPeoplePageWidgets().mergeWithDefaults());
        }
        return userRepository.save(user);
    }

    public List<User> findAssignableUsers(String workspaceId, String query, String teamId, boolean includeAdmins) {
        List<User> users = listUsersForWorkspace(workspaceId, includeAdmins);
        String normalizedQuery = query != null ? query.trim().toLowerCase(Locale.ROOT) : "";
        String normalizedTeamId = teamId != null ? teamId.trim() : "";

        return users.stream()
            .filter(user -> includeAdmins || !user.isAdmin())
            .filter(user -> {
                if (normalizedQuery.isEmpty()) {
                    return true;
                }
                String displayName = user.getDisplayName() != null ? user.getDisplayName().toLowerCase(Locale.ROOT) : "";
                String email = user.getEmail() != null ? user.getEmail().toLowerCase(Locale.ROOT) : "";
                return displayName.contains(normalizedQuery) || email.contains(normalizedQuery);
            })
            .filter(user -> {
                if (normalizedTeamId.isEmpty()) {
                    return true;
                }
                if (user.getTeamId() != null && normalizedTeamId.equals(user.getTeamId().trim())) {
                    return true;
                }
                return user.getTeamIds() != null && user.getTeamIds().stream()
                    .filter(Objects::nonNull)
                    .map(String::trim)
                    .anyMatch(normalizedTeamId::equals);
            })
            .toList();
    }

    public List<User> listUsersForWorkspace(String workspaceId, boolean includeAdmins) {
        if (workspaceId == null || workspaceId.isBlank()) {
            return List.of();
        }
        List<String> userIds = workspaceMemberRepository
            .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE)
            .stream()
            .map(member -> member.getUserId())
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (userIds.isEmpty()) {
            return List.of();
        }
        List<User> users = userRepository.findAllById(userIds);
        if (includeAdmins) {
            return users;
        }
        return users.stream()
            .filter(user -> !user.isAdmin())
            .toList();
    }

    public boolean isAdmin(org.springframework.security.core.Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return false;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof com.pmd.auth.security.UserPrincipal userPrincipal) {
            User user = findById(userPrincipal.getId());
            return accessPolicy.isAdmin(user);
        }
        return false;
    }

    public boolean isAdmin(User user) {
        return accessPolicy.isAdmin(user);
    }

    public boolean isAdminTeam(User user) {
        return user != null && user.isAdmin();
    }

    public Map<String, Long> findActiveProjectCounts(String workspaceId, List<User> users, boolean includeAdminProjects) {
        if (users == null || users.isEmpty()) {
            return Collections.emptyMap();
        }
        List<String> userIds = users.stream()
            .map(User::getId)
            .filter(Objects::nonNull)
            .toList();
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Criteria criteria = Criteria.where("workspaceId").is(workspaceId)
            .and("status").in(ProjectStatus.NOT_STARTED, ProjectStatus.IN_PROGRESS);
        Aggregation aggregation = Aggregation.newAggregation(
            Aggregation.match(criteria),
            Aggregation.unwind("memberIds"),
            Aggregation.match(Criteria.where("memberIds").in(userIds)),
            Aggregation.group("memberIds").count().as("count")
        );
        AggregationResults<ActiveCountResult> results = mongoTemplate.aggregate(
            aggregation,
            "projects",
            ActiveCountResult.class
        );
        return results.getMappedResults().stream()
            .filter(result -> result.getId() != null)
            .collect(Collectors.toMap(ActiveCountResult::getId, ActiveCountResult::getCount));
    }

    private Map<String, List<String>> findWorkspaceRoleAssignments(String workspaceId, List<User> users) {
        if (workspaceId == null || workspaceId.isBlank() || users == null || users.isEmpty()) {
            return Collections.emptyMap();
        }
        List<String> userIds = users.stream()
            .map(User::getId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        if (userIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, List<String>> assignments = new HashMap<>();
        workspaceMemberRepository.findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE).forEach(member -> {
            if (member.getUserId() == null || !userIds.contains(member.getUserId())) {
                return;
            }
            List<String> orderedRoleIds = normalizeIds(member.getRoleIds());
            String primaryRoleId = member.getRoleId() != null ? member.getRoleId().trim() : "";
            if (!primaryRoleId.isBlank()) {
                orderedRoleIds.remove(primaryRoleId);
                orderedRoleIds.add(0, primaryRoleId);
            }
            if (!orderedRoleIds.isEmpty()) {
                assignments.put(member.getUserId(), orderedRoleIds);
            }
        });
        return assignments;
    }

    public Map<String, WorkspaceRoleDisplay> findWorkspaceRoleDisplays(String workspaceId, List<User> users) {
        Map<String, List<WorkspaceRoleBadgeEntry>> entriesByUser = findWorkspaceRoleBadgeEntries(workspaceId, users);
        if (entriesByUser.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, WorkspaceRoleDisplay> displays = new HashMap<>();
        entriesByUser.forEach((userId, entries) -> {
            if (entries == null || entries.isEmpty()) {
                return;
            }
            WorkspaceRoleBadgeEntry primary = entries.get(0);
            displays.put(userId, new WorkspaceRoleDisplay(
                primary.roleName(),
                primary.roleBadgeLabel(),
                primary.roleBadgeColor()
            ));
        });
        return displays;
    }

    public Map<String, List<WorkspaceRoleBadgeEntry>> findWorkspaceRoleBadgeEntries(String workspaceId, List<User> users) {
        Map<String, List<String>> assignments = findWorkspaceRoleAssignments(workspaceId, users);
        if (assignments.isEmpty()) {
            return Collections.emptyMap();
        }
        List<String> roleIds = assignments.values().stream()
            .flatMap(List::stream)
            .filter(Objects::nonNull)
            .distinct()
            .toList();
        Map<String, WorkspaceRole> rolesById = roleIds.isEmpty()
            ? Collections.emptyMap()
            : workspaceRoleRepository.findAllById(roleIds).stream()
                .filter(role -> workspaceId.equals(role.getWorkspaceId()))
                .collect(Collectors.toMap(WorkspaceRole::getId, role -> role, (first, second) -> first));

        Map<String, List<WorkspaceRoleBadgeEntry>> displays = new HashMap<>();
        assignments.forEach((userId, orderedRoleIds) -> {
            List<WorkspaceRoleBadgeEntry> userEntries = new ArrayList<>();
            for (String roleId : orderedRoleIds) {
                WorkspaceRole role = rolesById.get(roleId);
                if (role == null) {
                    continue;
                }
                String roleName = role.getName();
                String badgeLabel = roleName;
                String badgeColor = null;
                if (role.getBadge() != null) {
                    String configuredLabel = role.getBadge().getLabel();
                    if (configuredLabel != null && !configuredLabel.isBlank()) {
                        badgeLabel = configuredLabel;
                    }
                    badgeColor = role.getBadge().getColor();
                }
                userEntries.add(new WorkspaceRoleBadgeEntry(role.getId(), roleName, badgeLabel, badgeColor));
            }
            if (!userEntries.isEmpty()) {
                displays.put(userId, userEntries);
            }
        });
        return displays;
    }

    public User ensureAdminSeedUser(String email, String passwordHash, String firstName, String lastName, String bio) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            User created = new User();
            created.setUsername(email);
            created.setEmail(email);
            created.setPasswordHash(passwordHash);
            created.setFirstName(firstName);
            created.setLastName(lastName);
            created.setDisplayName(buildDisplayName(firstName, lastName, email));
            created.setAdmin(true);
            created.setBio(bio);
            created.setEmailVerified(true);
            created.setCreatedAt(Instant.now());
            return userRepository.save(created);
        }
        boolean changed = false;
        if (!firstName.equals(user.getFirstName())) {
            user.setFirstName(firstName);
            changed = true;
        }
        if (!lastName.equals(user.getLastName())) {
            user.setLastName(lastName);
            changed = true;
        }
        if (bio != null && !bio.equals(user.getBio())) {
            user.setBio(bio);
            changed = true;
        }
        String displayName = buildDisplayName(firstName, lastName, email);
        if (!displayName.equals(user.getDisplayName())) {
            user.setDisplayName(displayName);
            changed = true;
        }
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordHash);
            changed = true;
        }
        user.setAdmin(true);
        if (changed) {
            return userRepository.save(user);
        }
        return user;
    }

    private String buildDisplayName(String firstName, String lastName, String fallback) {
        String first = firstName != null ? firstName.trim() : "";
        String last = lastName != null ? lastName.trim() : "";
        if (!first.isEmpty() && !last.isEmpty()) {
            return first + " " + last;
        }
        if (!first.isEmpty()) {
            return first;
        }
        if (!last.isEmpty()) {
            return last;
        }
        return fallback;
    }

    private static final class ActiveCountResult {
        @Field("_id")
        private String id;

        private long count;

        public String getId() {
            return id;
        }

        public long getCount() {
            return count;
        }
    }

    public record WorkspaceRoleDisplay(String roleName, String roleBadgeLabel, String roleBadgeColor) {
    }

    public record WorkspaceRoleBadgeEntry(String roleId, String roleName, String roleBadgeLabel, String roleBadgeColor) {
    }

    private List<String> normalizeIds(List<String> values) {
        if (values == null || values.isEmpty()) {
            return new ArrayList<>();
        }
        return values.stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isBlank())
            .collect(Collectors.collectingAndThen(
                Collectors.toCollection(LinkedHashSet::new),
                ArrayList::new
            ));
    }
}
