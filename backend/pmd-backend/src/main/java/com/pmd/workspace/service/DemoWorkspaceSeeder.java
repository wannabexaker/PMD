package com.pmd.workspace.service;

import com.pmd.person.model.Person;
import com.pmd.person.repository.PersonRepository;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectCommentEntity;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectCommentRepository;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.model.Team;
import com.pmd.team.repository.TeamRepository;
import com.pmd.team.service.TeamService;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceInviteRepository;
import com.pmd.workspace.repository.WorkspaceJoinRequestRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class DemoWorkspaceSeeder {

    private static final List<String> DEFAULT_TEAMS = List.of(
        "Web Development",
        "Software Engineering",
        "Network Engineering",
        "Cybersecurity",
        "DevOps",
        "QA / Testing",
        "Data Engineering",
        "Project Management",
        "UX / UI Design",
        "IT Support / Helpdesk"
    );

    // Indices reference SEED_USERS list positions (0-based)
    private static final List<SeedUser> SEED_USERS = List.of(
        new SeedUser("Alex",   "Johnson",  "Web Development",       "Owner"),   // 0
        new SeedUser("Bianca", "Lopez",    "Software Engineering",  "Manager"), // 1
        new SeedUser("Chris",  "Nguyen",   "Data Engineering",      "Member"),  // 2
        new SeedUser("Dana",   "Rossi",    "DevOps",                "Member"),  // 3
        new SeedUser("Evan",   "Kim",      "UX / UI Design",        "Member"),  // 4
        new SeedUser("Farah",  "Patel",    "Cybersecurity",         "Viewer"),  // 5
        new SeedUser("Gabe",   "Williams", "QA / Testing",          "Member"),  // 6
        new SeedUser("Hana",   "Sato",     "IT Support / Helpdesk", "Member"),  // 7
        new SeedUser("Iris",   "Morgan",   "Network Engineering",   "Member"),  // 8
        new SeedUser("Leo",    "Bennett",  "Project Management",    "Member")   // 9
    );

    private static final List<SeedProject> SEED_PROJECTS = List.of(
        new SeedProject("Launchpad Revamp",
            "Modernize the internal project hub with a new component library and improved navigation",
            ProjectStatus.IN_PROGRESS, "Web Development",
            List.of(0, 1, 4, 6),   // Alex, Bianca, Evan, Gabe
            List.of(
                new SeedComment(1, "Finished the API integration for the nav redesign — all endpoints are wired up.", 90),
                new SeedComment(4, "New sidebar mockups are ready for review. Should save around 30% navigation time.", 60),
                new SeedComment(0, "Pushed the initial component library update. Breaking changes are documented in CHANGELOG.", 120)
            ),
            75
        ),
        new SeedProject("Data Lake Hardening",
            "Improve data lineage tracking and add quality gate checks across all ingestion pipelines",
            ProjectStatus.NOT_STARTED, "Data Engineering",
            List.of(2, 3, 9),      // Chris, Dana, Leo
            List.of(),
            0
        ),
        new SeedProject("QA Automation Sprint",
            "Expand the automated regression suite to cover all critical user journeys end-to-end",
            ProjectStatus.IN_PROGRESS, "QA / Testing",
            List.of(6, 1, 2),      // Gabe, Bianca, Chris
            List.of(
                new SeedComment(6, "Added 47 new regression tests for the checkout and onboarding flows.", 150),
                new SeedComment(1, "Framework upgrade is complete — all existing tests are green.", 75),
                new SeedComment(2, "Integrated test results into the CI pipeline. Failures now block merge.", 45)
            ),
            60
        ),
        new SeedProject("DevOps Control Plane",
            "Standardize deployment playbooks and unify infrastructure-as-code across all environments",
            ProjectStatus.NOT_STARTED, "DevOps",
            List.of(3, 8, 0),      // Dana, Iris, Alex
            List.of(),
            0
        ),
        new SeedProject("Design System Refresh",
            "Unify UI tokens, typography, and component variants across the entire product surface",
            ProjectStatus.COMPLETED, "UX / UI Design",
            List.of(4, 0, 7),      // Evan, Alex, Hana
            List.of(
                new SeedComment(4, "All component variants migrated to the new token system. Storybook updated.", 180),
                new SeedComment(0, "Final review done. Shipped to production with zero regressions.", 60)
            ),
            100
        ),
        new SeedProject("Zero Trust Rollout",
            "Stage rollout plan for Zero Trust security posture across network and identity layers",
            ProjectStatus.IN_PROGRESS, "Cybersecurity",
            List.of(5, 8, 6),      // Farah, Iris, Gabe
            List.of(
                new SeedComment(5, "MFA enforcement complete for 80% of users. Remaining accounts flagged for manual review.", 120),
                new SeedComment(8, "Network segmentation rules are deployed in staging — no lateral movement detected.", 90),
                new SeedComment(6, "Ran the full penetration scan. No critical findings, two medium items logged.", 200)
            ),
            55
        ),
        new SeedProject("Network Observability",
            "Improve real-time network traffic visibility and add anomaly detection for east-west flows",
            ProjectStatus.NOT_STARTED, "Network Engineering",
            List.of(8, 3, 1),      // Iris, Dana, Bianca
            List.of(),
            0
        ),
        new SeedProject("Helpdesk Knowledge Base",
            "Centralize and restructure support articles into a self-service knowledge base portal",
            ProjectStatus.IN_PROGRESS, "IT Support / Helpdesk",
            List.of(7, 9, 0),      // Hana, Leo, Alex
            List.of(
                new SeedComment(7, "Migrated 120 legacy support articles into the new structure. Tagging is complete.", 180),
                new SeedComment(9, "Analytics dashboard for KB views is live — top 10 articles identified for improvement.", 60)
            ),
            40
        ),
        new SeedProject("Product Analytics Hub",
            "Define KPI tracking dashboards and establish a single source of truth for product metrics",
            ProjectStatus.NOT_STARTED, "Project Management",
            List.of(9, 2, 1),      // Leo, Chris, Bianca
            List.of(),
            0
        ),
        new SeedProject("Data Pipeline Optimization",
            "Reduce ETL latency and processing cost by refactoring batch reads and adding smarter caching",
            ProjectStatus.IN_PROGRESS, "Data Engineering",
            List.of(2, 3, 1),      // Chris, Dana, Bianca
            List.of(
                new SeedComment(2, "Batch read refactor is done — end-to-end latency dropped by 40% in benchmarks.", 240),
                new SeedComment(3, "Optimized the staging environment pipeline. Cold-start time down from 8 min to 90 sec.", 120),
                new SeedComment(1, "Monitoring alerts and SLO dashboards are configured for all pipeline stages.", 45)
            ),
            65
        )
    );

    private final TeamRepository teamRepository;
    private final TeamService teamService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceRoleRepository workspaceRoleRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final WorkspaceJoinRequestRepository workspaceJoinRequestRepository;
    private final WorkspaceRepository workspaceRepository;
    private final PersonRepository personRepository;
    private final ProjectRepository projectRepository;
    private final ProjectCommentRepository projectCommentRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoWorkspaceSeeder(TeamRepository teamRepository,
                               TeamService teamService,
                               UserService userService,
                               UserRepository userRepository,
                               WorkspaceMemberRepository workspaceMemberRepository,
                               WorkspaceRoleRepository workspaceRoleRepository,
                               WorkspaceInviteRepository workspaceInviteRepository,
                               WorkspaceJoinRequestRepository workspaceJoinRequestRepository,
                               WorkspaceRepository workspaceRepository,
                               PersonRepository personRepository,
                               ProjectRepository projectRepository,
                               ProjectCommentRepository projectCommentRepository,
                               PasswordEncoder passwordEncoder) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceRoleRepository = workspaceRoleRepository;
        this.workspaceInviteRepository = workspaceInviteRepository;
        this.workspaceJoinRequestRepository = workspaceJoinRequestRepository;
        this.workspaceRepository = workspaceRepository;
        this.personRepository = personRepository;
        this.projectRepository = projectRepository;
        this.projectCommentRepository = projectCommentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public void resetWorkspaceData(String workspaceId) {
        List<Project> projects = projectRepository.findByWorkspaceId(
            workspaceId,
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "createdAt")
        );
        List<String> projectIds = projects.stream()
            .map(Project::getId)
            .filter(id -> id != null)
            .toList();
        if (!projectIds.isEmpty()) {
            projectCommentRepository.deleteByProjectIdIn(projectIds);
        }
        projectRepository.deleteAll(projects);
        personRepository.deleteAll(personRepository.findByWorkspaceId(workspaceId));
        teamRepository.deleteAll(teamRepository.findByWorkspaceId(workspaceId));
        workspaceInviteRepository.deleteAll(workspaceInviteRepository.findByWorkspaceId(workspaceId));
        workspaceJoinRequestRepository.deleteAll(workspaceJoinRequestRepository.findAllByWorkspaceId(workspaceId));
        workspaceMemberRepository.deleteAll(workspaceMemberRepository.findByWorkspaceId(workspaceId));
        workspaceRoleRepository.deleteAll(workspaceRoleRepository.findByWorkspaceId(workspaceId));
    }

    public void seedWorkspace(String workspaceId, User owner) {
        Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
        if (workspace != null && !workspace.isRequireApproval()) {
            workspace.setRequireApproval(true);
            workspaceRepository.save(workspace);
        }

        Map<String, WorkspaceRole> roles = ensureRoles(workspaceId, owner);
        ensureTeams(workspaceId, owner);
        Map<String, Team> teamByName = teamRepository.findByWorkspaceIdAndIsActiveTrue(
            workspaceId,
            org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.ASC, "name")
        ).stream().collect(Collectors.toMap(
            team -> team.getName().toLowerCase(Locale.ROOT),
            team -> team,
            (a, b) -> a
        ));

        List<User> demoUsers = new ArrayList<>();
        for (SeedUser seed : SEED_USERS) {
            User user = ensureDemoUser(seed, workspaceId);
            Team team = teamByName.get(seed.teamName().toLowerCase(Locale.ROOT));
            if (team != null) {
                user.setTeamId(team.getId());
                user.setTeam(team.getName());
                userService.save(user);
            }
            WorkspaceRole role = roles.get(seed.roleName().toLowerCase(Locale.ROOT));
            ensureMembership(workspaceId, user, role);
            demoUsers.add(user);
            ensurePersonRecord(seed, workspaceId, user);
        }
        if (owner != null) {
            WorkspaceRole ownerRole = roles.get("owner");
            ensureMembership(workspaceId, owner, ownerRole);
        }

        Instant now = Instant.now();
        for (SeedProject seedProject : SEED_PROJECTS) {
            Team team = teamByName.get(seedProject.teamName().toLowerCase(Locale.ROOT));

            // Pick members by index; fall back to owner if list is empty
            List<User> projectMembers = seedProject.memberIndices().stream()
                .filter(i -> i >= 0 && i < demoUsers.size())
                .map(demoUsers::get)
                .toList();
            User author = projectMembers.isEmpty()
                ? (owner != null ? owner : (!demoUsers.isEmpty() ? demoUsers.get(0) : null))
                : projectMembers.get(0);

            // Spread createdAt over the last 90 days
            long daysAgo = ThreadLocalRandom.current().nextLong(10, 91);
            Instant projectCreatedAt = now.minus(daysAgo, ChronoUnit.DAYS);

            Project saved = ensureProject(seedProject, workspaceId, author, team, projectMembers, projectCreatedAt);
            if (saved != null) {
                seedComments(saved, seedProject, demoUsers, projectCreatedAt);
            }
        }

        ensurePendingJoinRequest(workspaceId);
        ensureDemoInvite(workspaceId, owner);
    }

    private void ensureTeams(String workspaceId, User owner) {
        for (String name : DEFAULT_TEAMS) {
            if (name == null || name.isBlank()) {
                continue;
            }
            if (teamRepository.existsByNameIgnoreCaseAndWorkspaceId(name, workspaceId)) {
                continue;
            }
            teamService.createTeam(new com.pmd.team.dto.TeamRequest(name), owner, workspaceId);
        }
    }

    private Map<String, WorkspaceRole> ensureRoles(String workspaceId, User owner) {
        Map<String, WorkspaceRole> byName = workspaceRoleRepository.findByWorkspaceId(workspaceId).stream()
            .filter(role -> role.getName() != null)
            .collect(Collectors.toMap(role -> role.getName().toLowerCase(Locale.ROOT), role -> role, (a, b) -> a));
        WorkspaceRole ownerRole   = upsertSystemRole(workspaceId, "Owner",   WorkspaceRolePermissions.ownerDefaults(),   owner, byName.get("owner"));
        WorkspaceRole managerRole = upsertSystemRole(workspaceId, "Manager", WorkspaceRolePermissions.managerDefaults(), owner, byName.get("manager"));
        WorkspaceRole memberRole  = upsertSystemRole(workspaceId, "Member",  WorkspaceRolePermissions.memberDefaults(),  owner, byName.get("member"));
        WorkspaceRole viewerRole  = upsertSystemRole(workspaceId, "Viewer",  WorkspaceRolePermissions.viewerDefaults(),  owner, byName.get("viewer"));
        return Map.of(
            "owner",   ownerRole,
            "manager", managerRole,
            "member",  memberRole,
            "viewer",  viewerRole
        );
    }

    private WorkspaceRole upsertSystemRole(String workspaceId, String name, WorkspaceRolePermissions permissions,
                                           User owner, WorkspaceRole existing) {
        WorkspaceRole role = existing != null ? existing : new WorkspaceRole();
        role.setWorkspaceId(workspaceId);
        role.setName(name);
        role.setSystem(true);
        role.setPermissions(permissions);
        if (role.getCreatedAt() == null) {
            role.setCreatedAt(Instant.now());
        }
        if (role.getCreatedByUserId() == null && owner != null) {
            role.setCreatedByUserId(owner.getId());
        }
        return workspaceRoleRepository.save(role);
    }

    private WorkspaceMemberRole mapLegacyRole(String roleName) {
        if (roleName == null) {
            return WorkspaceMemberRole.MEMBER;
        }
        String normalized = roleName.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "owner" -> WorkspaceMemberRole.OWNER;
            case "manager", "admin" -> WorkspaceMemberRole.ADMIN;
            default -> WorkspaceMemberRole.MEMBER;
        };
    }

    private User ensureDemoUser(SeedUser seed, String workspaceId) {
        String email = buildDemoEmail(seed, workspaceId);
        Optional<User> existing = userRepository.findByEmail(email);
        if (existing.isPresent()) {
            return existing.get();
        }
        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setFirstName(seed.firstName());
        user.setLastName(seed.lastName());
        user.setDisplayName(seed.firstName() + " " + seed.lastName());
        user.setPasswordHash(passwordEncoder.encode("demo123!"));
        user.setEmailVerified(true);
        user.setTeam(seed.teamName());
        user.setTeamId(null);
        return userService.save(user);
    }

    private void ensureMembership(String workspaceId, User user, WorkspaceRole role) {
        if (user == null || user.getId() == null) {
            return;
        }
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .orElseGet(() -> {
                WorkspaceMember member = new WorkspaceMember();
                member.setWorkspaceId(workspaceId);
                member.setUserId(user.getId());
                if (role != null) {
                    member.setRoleId(role.getId());
                    member.setDisplayRoleName(role.getName());
                    member.setRole(mapLegacyRole(role.getName()));
                } else {
                    member.setRole(WorkspaceMemberRole.MEMBER);
                }
                member.setStatus(WorkspaceMemberStatus.ACTIVE);
                member.setCreatedAt(Instant.now());
                member.setJoinedAt(Instant.now());
                return workspaceMemberRepository.save(member);
            });
    }

    private void ensurePersonRecord(SeedUser seed, String workspaceId, User user) {
        String email = user != null ? user.getEmail() : buildDemoEmail(seed, workspaceId);
        if (email == null) {
            return;
        }
        Optional<Person> existing = personRepository.findByWorkspaceIdAndEmail(workspaceId, email);
        if (existing.isPresent()) {
            return;
        }
        Person person = new Person();
        person.setDisplayName(seed.firstName() + " " + seed.lastName());
        person.setEmail(email);
        person.setWorkspaceId(workspaceId);
        person.setCreatedAt(Instant.now());
        personRepository.save(person);
    }

    private Project ensureProject(SeedProject seed, String workspaceId, User author, Team team,
                                  List<User> members, Instant createdAt) {
        Optional<Project> existing = projectRepository.findByWorkspaceIdAndName(workspaceId, seed.name());
        Project project = existing.orElseGet(Project::new);
        project.setName(seed.name());
        project.setDescription(seed.description());
        project.setStatus(seed.status());
        project.setWorkspaceId(workspaceId);
        if (project.getCreatedAt() == null) {
            project.setCreatedAt(createdAt);
        }
        if (author != null) {
            project.setCreatedByUserId(author.getId());
            project.setCreatedByTeam(author.getTeam());
        }
        if (team != null) {
            project.setTeamId(team.getId());
            project.setCreatedByTeam(team.getName());
        }
        if (members != null && !members.isEmpty()) {
            List<String> memberIds = members.stream()
                .map(User::getId)
                .filter(id -> id != null)
                .toList();
            project.setMemberIds(memberIds);
        }
        return projectRepository.save(project);
    }

    private void seedComments(Project project, SeedProject seed, List<User> demoUsers, Instant projectCreatedAt) {
        if (seed.comments().isEmpty()) {
            return;
        }
        String projectId = project.getId();
        if (projectId == null) {
            return;
        }
        // Only seed comments when none exist yet
        if (projectCommentRepository.findByProjectId(projectId,
                org.springframework.data.domain.PageRequest.of(0, 1)).hasContent()) {
            return;
        }
        // Space comments evenly within the days since the project was created
        long projectAgeDays = ChronoUnit.DAYS.between(projectCreatedAt, Instant.now());
        long commentCount = seed.comments().size();
        for (int i = 0; i < seed.comments().size(); i++) {
            SeedComment sc = seed.comments().get(i);
            if (sc.userIndex() < 0 || sc.userIndex() >= demoUsers.size()) {
                continue;
            }
            User author = demoUsers.get(sc.userIndex());
            // Space comments from 1 day after project creation up to yesterday
            long daysOffset = projectAgeDays > 0
                ? (long) ((i + 1.0) / (commentCount + 1) * projectAgeDays)
                : i;
            Instant commentAt = projectCreatedAt.plus(Math.max(1, daysOffset), ChronoUnit.DAYS);

            ProjectCommentEntity comment = new ProjectCommentEntity();
            comment.setProjectId(projectId);
            comment.setAuthorUserId(author.getId());
            comment.setAuthorName(author.getDisplayName());
            comment.setMessage(sc.message());
            comment.setTimeSpentMinutes(sc.timeSpentMinutes());
            comment.setCreatedAt(commentAt);
            projectCommentRepository.save(comment);
        }
    }

    private void ensurePendingJoinRequest(String workspaceId) {
        SeedUser pendingSeed = new SeedUser("Ivan", "Petrov", "Project Management", "Member");
        User user = ensureDemoUser(pendingSeed, workspaceId);
        if (user.getId() == null) {
            return;
        }
        Optional<WorkspaceMember> existingMember = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId());
        if (existingMember.isPresent() && existingMember.get().getStatus() == WorkspaceMemberStatus.ACTIVE) {
            return;
        }
        WorkspaceJoinRequest request = workspaceJoinRequestRepository
            .findByWorkspaceIdAndUserIdAndStatus(workspaceId, user.getId(), WorkspaceJoinRequestStatus.PENDING)
            .stream()
            .findFirst()
            .orElseGet(WorkspaceJoinRequest::new);
        request.setWorkspaceId(workspaceId);
        request.setUserId(user.getId());
        request.setStatus(WorkspaceJoinRequestStatus.PENDING);
        request.setInviteQuestion("Why do you want to join this workspace?");
        request.setInviteAnswer("I want to collaborate with the team.");
        request.setDecidedAt(null);
        request.setDecidedByUserId(null);
        request.setCreatedAt(request.getCreatedAt() != null ? request.getCreatedAt() : Instant.now());
        workspaceJoinRequestRepository.save(request);

        WorkspaceMember member = existingMember.orElseGet(WorkspaceMember::new);
        member.setWorkspaceId(workspaceId);
        member.setUserId(user.getId());
        member.setRole(WorkspaceMemberRole.MEMBER);
        member.setStatus(WorkspaceMemberStatus.PENDING);
        member.setCreatedAt(member.getCreatedAt() != null ? member.getCreatedAt() : Instant.now());
        member.setJoinedAt(null);
        workspaceMemberRepository.save(member);
    }

    private void ensureDemoInvite(String workspaceId, User owner) {
        List<WorkspaceInvite> invites = workspaceInviteRepository.findByWorkspaceId(workspaceId);
        WorkspaceInvite existing = invites.stream()
            .filter(invite -> ("demo-" + workspaceId + "-invite").equalsIgnoreCase(invite.getToken()))
            .findFirst()
            .orElse(null);
        if (existing != null) {
            if (existing.getCode() == null || existing.getCode().isBlank() || "PMD-DEMO".equalsIgnoreCase(existing.getCode())) {
                existing.setCode(generateUniqueDemoInviteCode());
                workspaceInviteRepository.save(existing);
            }
            return;
        }
        WorkspaceInvite invite = new WorkspaceInvite();
        invite.setWorkspaceId(workspaceId);
        invite.setToken("demo-" + workspaceId + "-invite");
        invite.setCode(generateUniqueDemoInviteCode());
        invite.setExpiresAt(Instant.now().plusSeconds(60L * 60L * 24L * 30L));
        invite.setMaxUses(25);
        invite.setUsesCount(0);
        invite.setRevoked(false);
        invite.setCreatedAt(Instant.now());
        invite.setCreatedByUserId(owner != null ? owner.getId() : null);
        workspaceInviteRepository.save(invite);
    }

    private String generateUniqueDemoInviteCode() {
        for (int i = 0; i < 40; i++) {
            int number = ThreadLocalRandom.current().nextInt(1, 10000);
            String candidate = String.format("PMD-DEMO-%04d", number);
            if (workspaceInviteRepository.findByCode(candidate).isEmpty()) {
                return candidate;
            }
        }
        return "PMD-DEMO-" + Long.toString(Math.abs(ThreadLocalRandom.current().nextLong()), 36).toUpperCase(Locale.ROOT);
    }

    private String buildDemoEmail(SeedUser seed, String workspaceId) {
        String base = (seed.firstName() + "." + seed.lastName()).toLowerCase(Locale.ROOT).replace(" ", "");
        return base + "+" + workspaceId + "@pmd.local";
    }

    private record SeedUser(String firstName, String lastName, String teamName, String roleName) {}

    private record SeedProject(
        String name,
        String description,
        ProjectStatus status,
        String teamName,
        List<Integer> memberIndices,
        List<SeedComment> comments,
        int completionPercent
    ) {}

    private record SeedComment(int userIndex, String message, int timeSpentMinutes) {}
}
