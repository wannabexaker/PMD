package com.pmd.demo;

import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DemoSeeder implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DemoSeeder.class);

    private final Environment environment;
    private final UserService userService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoSeeder(Environment environment,
                      UserService userService,
                      UserRepository userRepository,
                      ProjectRepository projectRepository,
                      PasswordEncoder passwordEncoder) {
        this.environment = environment;
        this.userService = userService;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!shouldSeed()) {
            return;
        }
        // Demo seed: only runs in dev profile or PMD_SEED_DEMO=true.
        User admin = userService.ensureAdminSeedUser(
            "admin1@pmd.local",
            passwordEncoder.encode("admin321"),
            "admin",
            "admin",
            ""
        );

        User user1 = ensureUser("user1@pmd.local", "User123!", "John", "Doe", "Web Developer Team", "");
        User user2 = ensureUser("user2@pmd.local", "User123!", "Maria", "Stone", "Project Manager", "");
        User user3 = ensureUser("user3@pmd.local", "User123!", "Nikos", "Papas", "QA", "");

        Project projectA = ensureProject(
            "Project A",
            "Demo project A",
            ProjectStatus.IN_PROGRESS,
            admin
        );
        Project projectB = ensureProject(
            "Website Refresh",
            "Demo website refresh project",
            ProjectStatus.NOT_STARTED,
            user2
        );
        Project projectC = ensureProject(
            "Migration Cleanup",
            "Demo migration cleanup project",
            ProjectStatus.COMPLETED,
            user2
        );

        ensureAssignments(projectA, List.of(admin));
        ensureAssignments(projectB, List.of(user1, user3));
        ensureAssignments(projectC, List.of(user1, user2));

        logger.info("Demo seed completed.");
    }

    private boolean shouldSeed() {
        String flag = environment.getProperty("PMD_SEED_DEMO", "false");
        if (Boolean.parseBoolean(flag)) {
            return true;
        }
        for (String profile : environment.getActiveProfiles()) {
            if ("dev".equalsIgnoreCase(profile)) {
                return true;
            }
        }
        return false;
    }

    private User ensureUser(String email, String rawPassword, String firstName, String lastName, String team, String bio) {
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            User user = existing.get();
            boolean changed = false;
            if (isBlank(user.getFirstName())) {
                user.setFirstName(firstName);
                changed = true;
            }
            if (isBlank(user.getLastName())) {
                user.setLastName(lastName);
                changed = true;
            }
            if (user.getBio() == null) {
                user.setBio(bio);
                changed = true;
            }
            if (isBlank(user.getTeam())) {
                user.setTeam(team);
                changed = true;
            }
            if (isBlank(user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode(rawPassword));
                changed = true;
            }
            if (changed) {
                return userService.save(user);
            }
            return user;
        }

        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setDisplayName(buildDisplayName(firstName, lastName, email));
        user.setTeam(team);
        user.setBio(bio);
        user.setEmailVerified(true);
        return userService.save(user);
    }

    private Project ensureProject(String name, String description, ProjectStatus status, User author) {
        if (author == null || author.getId() == null) {
            logger.warn("Skipping project {} because author is missing.", name);
            return null;
        }
        Project project = projectRepository.findByName(name).orElseGet(Project::new);
        project.setName(name);
        project.setDescription(description);
        project.setStatus(status);
        if (project.getCreatedAt() == null) {
            project.setCreatedAt(Instant.now());
        }
        project.setCreatedByUserId(author.getId());
        project.setCreatedByTeam(normalizeTeam(author.getTeam()));
        return projectRepository.save(project);
    }

    private void ensureAssignments(Project project, List<User> members) {
        if (project == null) {
            return;
        }
        Set<String> ids = new HashSet<>();
        if (project.getMemberIds() != null) {
            ids.addAll(project.getMemberIds());
        }
        for (User user : members) {
            if (user != null && user.getId() != null) {
                ids.add(user.getId());
            }
        }
        project.setMemberIds(new ArrayList<>(ids));
        projectRepository.save(project);
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

    private String normalizeTeam(String team) {
        if (team == null) {
            return null;
        }
        String lower = team.toLowerCase(Locale.ROOT);
        if ("admin".equals(lower) || "admins".equals(lower)) {
            return "admin";
        }
        return team;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
