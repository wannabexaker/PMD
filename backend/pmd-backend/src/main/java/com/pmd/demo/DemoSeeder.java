package com.pmd.demo;

import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.model.Team;
import com.pmd.team.service.TeamService;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import com.pmd.util.StartupMongoRetry;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

    private static final List<SeedUser> SEED_USERS = List.of(
        new SeedUser("elon.musk@pmd.local", "Tesla321!", "Elon", "Musk", "Web Development", "Space transportation & energy"),
        new SeedUser("jeff.bezos@pmd.local", "Blue321!", "Jeff", "Bezos", "Software Engineering", "Heavy lift & e-commerce"),
        new SeedUser("sundar.pichai@pmd.local", "Google321!", "Sundar", "Pichai", "Data Engineering", "AI and search"),
        new SeedUser("satya.nadella@pmd.local", "Azure321!", "Satya", "Nadella", "DevOps", "Cloud + productivity"),
        new SeedUser("tim.cook@pmd.local", "Apple321!", "Tim", "Cook", "UX / UI Design", "Consumer hardware"),
        new SeedUser("mark.zuckerberg@pmd.local", "Meta321!", "Mark", "Zuckerberg", "Project Management", "Social + VR"),
        new SeedUser("jensen.huang@pmd.local", "Nvidia321!", "Jensen", "Huang", "Network Engineering", "GPUs + AI"),
        new SeedUser("ginni.romeo@pmd.local", "IBM321!", "Ginni", "Rometty", "Cybersecurity", "Enterprise software"),
        new SeedUser("safra.catz@pmd.local", "Oracle321!", "Safra", "Catz", "QA / Testing", "Database clouds"),
        new SeedUser("melinda.gates@pmd.local", "Gates321!", "Melinda", "Gates", "IT Support / Helpdesk", "Tech for good")
    );

    private static final List<SeedProject> SEED_PROJECTS = List.of(
        new SeedProject("Starship Reuse Initiative", "Reusable launch pipeline for orbital cargo", ProjectStatus.IN_PROGRESS,
            List.of("elon.musk@pmd.local"), "elon.musk@pmd.local"),
        new SeedProject("Prime Robotics Labs", "Autonomous fulfillment fleet for Prime warehouses",
            ProjectStatus.NOT_STARTED, List.of("jeff.bezos@pmd.local", "elon.musk@pmd.local"), "jeff.bezos@pmd.local"),
        new SeedProject("Gemini AI Studio", "Next-gen multimodal AI across Google workspace",
            ProjectStatus.IN_PROGRESS, List.of("sundar.pichai@pmd.local"), "sundar.pichai@pmd.local"),
        new SeedProject("Azure Quantum Explorer", "Commercial quantum development environment",
            ProjectStatus.NOT_STARTED, List.of("satya.nadella@pmd.local"), "satya.nadella@pmd.local"),
        new SeedProject("Apple AR Glasses", "Lightweight AR hardware with personal AI",
            ProjectStatus.IN_PROGRESS, List.of("tim.cook@pmd.local"), "tim.cook@pmd.local"),
        new SeedProject("Meta Horizon Campus", "Immersive collaboration for distributed teams",
            ProjectStatus.NOT_STARTED, List.of("mark.zuckerberg@pmd.local"), "mark.zuckerberg@pmd.local"),
        new SeedProject("AI Research Superchip", "NVIDIA Hopper follow-up for exascale training",
            ProjectStatus.COMPLETED, List.of("jensen.huang@pmd.local", "sundar.pichai@pmd.local"), "jensen.huang@pmd.local"),
        new SeedProject("IBM Hybrid Cloud Fabric", "Secure hybrid cloud for regulated industries",
            ProjectStatus.IN_PROGRESS, List.of("ginni.romeo@pmd.local"), "ginni.romeo@pmd.local"),
        new SeedProject("Oracle Autonomous Supply Chain", "Digital twin planning with autonomous ops",
            ProjectStatus.NOT_STARTED, List.of("safra.catz@pmd.local"), "safra.catz@pmd.local"),
        new SeedProject("Global Health Data Commons", "Philanthropy-backed health insights platform",
            ProjectStatus.COMPLETED, List.of("melinda.gates@pmd.local", "sundar.pichai@pmd.local"), "melinda.gates@pmd.local")
    );

    private final Environment environment;
    private final UserService userService;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final PasswordEncoder passwordEncoder;
    private final TeamService teamService;

    public DemoSeeder(Environment environment,
                      UserService userService,
                      UserRepository userRepository,
                      ProjectRepository projectRepository,
                      PasswordEncoder passwordEncoder,
                      TeamService teamService) {
        this.environment = environment;
        this.userService = userService;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.passwordEncoder = passwordEncoder;
        this.teamService = teamService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!shouldSeed()) {
            return;
        }
        StartupMongoRetry.runWithRetry(logger, "demo seed", () -> {
            logger.info("Starting demo seed run.");
            User admin = userService.ensureAdminSeedUser(
                "admin1@pmd.local",
                passwordEncoder.encode("admin321"),
                "admin",
                "admin",
                ""
            );

            Map<String, User> seededUsers = new LinkedHashMap<>();
            seededUsers.put(admin.getEmail(), admin);
            for (SeedUser seedUser : SEED_USERS) {
                User user = ensureUser(seedUser);
                seededUsers.put(user.getEmail(), user);
            }

            for (SeedProject projectSeed : SEED_PROJECTS) {
                User author = seededUsers.get(projectSeed.authorEmail());
                Project project = ensureProject(
                    projectSeed.name(),
                    projectSeed.description(),
                    projectSeed.status(),
                    author
                );
                if (project != null) {
                    List<User> assignees = new ArrayList<>();
                    for (String email : projectSeed.assignees()) {
                        User member = seededUsers.get(email);
                        if (member != null) {
                            assignees.add(member);
                        }
                    }
                    ensureAssignments(project, assignees);
                }
            }

            logger.info("Demo seed completed with {} users and {} projects.", seededUsers.size(), SEED_PROJECTS.size());
        });
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

    private User ensureUser(SeedUser seedUser) {
        Optional<User> existing = userRepository.findByEmail(seedUser.email());
        if (existing.isPresent()) {
            User user = existing.get();
            boolean changed = false;
            if (isBlank(user.getFirstName())) {
                user.setFirstName(seedUser.firstName());
                changed = true;
            }
            if (isBlank(user.getLastName())) {
                user.setLastName(seedUser.lastName());
                changed = true;
            }
            if (user.getBio() == null) {
                user.setBio(seedUser.bio());
                changed = true;
            }
            if (isBlank(user.getTeam())) {
                user.setTeam(seedUser.team());
                changed = true;
            }
            if (user.getTeamId() == null) {
                Team team = resolveTeam(seedUser.team());
                if (team != null) {
                    user.setTeamId(team.getId());
                    user.setTeam(team.getName());
                    changed = true;
                }
            }
            if (isBlank(user.getPasswordHash())) {
                user.setPasswordHash(passwordEncoder.encode(seedUser.password()));
                changed = true;
            }
            if (changed) {
                return userService.save(user);
            }
            return user;
        }

        User user = new User();
        user.setUsername(seedUser.email());
        user.setEmail(seedUser.email());
        user.setPasswordHash(passwordEncoder.encode(seedUser.password()));
        user.setFirstName(seedUser.firstName());
        user.setLastName(seedUser.lastName());
        user.setDisplayName(buildDisplayName(seedUser.firstName(), seedUser.lastName(), seedUser.email()));
        Team team = resolveTeam(seedUser.team());
        user.setTeam(team != null ? team.getName() : seedUser.team());
        user.setTeamId(team != null ? team.getId() : null);
        user.setBio(seedUser.bio());
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
        project.setCreatedByTeam(author.getTeam());
        project.setTeamId(author.getTeamId());
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

    private Team resolveTeam(String teamName) {
        if (teamName == null || teamName.isBlank()) {
            return null;
        }
        String slug = teamService.slugify(teamName);
        return teamService.findBySlug(slug).orElse(null);
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record SeedUser(String email, String password, String firstName, String lastName, String team, String bio) {
    }

    private record SeedProject(String name, String description, ProjectStatus status, List<String> assignees, String authorEmail) {
    }
}
