package com.pmd.user.service;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.auth.policy.AccessPolicy;
import com.pmd.project.model.ProjectStatus;
import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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

    public UserService(UserRepository userRepository, AccessPolicy accessPolicy, MongoTemplate mongoTemplate) {
        this.userRepository = userRepository;
        this.accessPolicy = accessPolicy;
        this.mongoTemplate = mongoTemplate;
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
        String normalizedTeam = normalizeTeam(user.getTeam());
        if (normalizedTeam != null) {
            user.setTeam(normalizedTeam);
        }
        if (user.getId() != null) {
            User existing = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
            if (isAdminTeam(existing) && !"admin".equals(user.getTeam())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin team is immutable");
            }
        } else if (user.getEmail() != null) {
            userRepository.findByEmail(user.getEmail()).ifPresent(existing -> {
                if (isAdminTeam(existing) && !"admin".equals(user.getTeam())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin team is immutable");
                }
            });
        }
        if (user.getCreatedAt() == null) {
            user.setCreatedAt(Instant.now());
        }
        user.setAdmin(isAdminTeam(user));
        return userRepository.save(user);
    }

    public List<User> findAssignableUsers(String query, String team, boolean includeAdmins) {
        List<User> users = includeAdmins ? userRepository.findAll() : userRepository.findByTeamNot("admin");
        String normalizedQuery = query != null ? query.trim().toLowerCase(Locale.ROOT) : "";
        String normalizedTeam = team != null ? team.trim().toLowerCase(Locale.ROOT) : "";

        return users.stream()
            .filter(user -> includeAdmins || !isAdminTeam(user))
            .filter(user -> {
                if (normalizedQuery.isEmpty()) {
                    return true;
                }
                String displayName = user.getDisplayName() != null ? user.getDisplayName().toLowerCase(Locale.ROOT) : "";
                String email = user.getEmail() != null ? user.getEmail().toLowerCase(Locale.ROOT) : "";
                return displayName.contains(normalizedQuery) || email.contains(normalizedQuery);
            })
            .filter(user -> {
                if (normalizedTeam.isEmpty()) {
                    return true;
                }
                String userTeam = user.getTeam() != null ? user.getTeam().toLowerCase(Locale.ROOT) : "";
                return userTeam.equals(normalizedTeam);
            })
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

    public boolean isAdminTeam(User user) {
        return user != null && "admin".equals(user.getTeam());
    }

    public Map<String, Long> findActiveProjectCounts(List<User> users, boolean includeAdminProjects) {
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
        Criteria criteria = Criteria.where("status").in(ProjectStatus.NOT_STARTED, ProjectStatus.IN_PROGRESS);
        if (!includeAdminProjects) {
            criteria = criteria.and("createdByTeam").ne("admin");
        }
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

    private String normalizeTeam(String team) {
        if (team == null) {
            return null;
        }
        if (team.equalsIgnoreCase("admin") || team.equalsIgnoreCase("admins")) {
            return "admin";
        }
        return team;
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
            created.setTeam("admin");
            created.setAdmin(true);
            created.setBio(bio);
            created.setEmailVerified(true);
            created.setCreatedAt(Instant.now());
            return userRepository.save(created);
        }
        boolean changed = false;
        if (!"admin".equals(user.getTeam())) {
            user.setTeam("admin");
            changed = true;
        }
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
}
