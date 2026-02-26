package com.pmd.workspace.service;

import com.pmd.person.model.Person;
import com.pmd.person.repository.PersonRepository;
import com.pmd.project.model.Project;
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

    private static final List<SeedUser> SEED_USERS = List.of(
        new SeedUser("Alex", "Johnson", "Web Development", "Owner"),
        new SeedUser("Bianca", "Lopez", "Software Engineering", "Manager"),
        new SeedUser("Chris", "Nguyen", "Data Engineering", "Member"),
        new SeedUser("Dana", "Rossi", "DevOps", "Member"),
        new SeedUser("Evan", "Kim", "UX / UI Design", "Member"),
        new SeedUser("Farah", "Patel", "Cybersecurity", "Viewer"),
        new SeedUser("Gabe", "Williams", "QA / Testing", "Member"),
        new SeedUser("Hana", "Sato", "IT Support / Helpdesk", "Member")
    );

    private static final List<SeedProject> SEED_PROJECTS = List.of(
        new SeedProject("Launchpad Revamp", "Modernize the internal project hub", ProjectStatus.IN_PROGRESS, "Web Development"),
        new SeedProject("Data Lake Hardening", "Improve lineage and quality checks", ProjectStatus.NOT_STARTED, "Data Engineering"),
        new SeedProject("QA Automation Sprint", "Expand automated regression suite", ProjectStatus.IN_PROGRESS, "QA / Testing"),
        new SeedProject("DevOps Control Plane", "Standardize deployment playbooks", ProjectStatus.NOT_STARTED, "DevOps"),
        new SeedProject("Design System Refresh", "Unify UI tokens and components", ProjectStatus.COMPLETED, "UX / UI Design"),
        new SeedProject("Zero Trust Rollout", "Stage rollout plan for security posture", ProjectStatus.IN_PROGRESS, "Cybersecurity"),
        new SeedProject("Network Observability", "Improve network traffic visibility", ProjectStatus.NOT_STARTED, "Network Engineering"),
        new SeedProject("Helpdesk Knowledge Base", "Centralize support articles", ProjectStatus.IN_PROGRESS, "IT Support / Helpdesk"),
        new SeedProject("Product Analytics Hub", "Define KPI tracking dashboards", ProjectStatus.NOT_STARTED, "Project Management"),
        new SeedProject("Data Pipeline Optimization", "Reduce ETL latency and cost", ProjectStatus.IN_PROGRESS, "Data Engineering")
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

        for (SeedProject seedProject : SEED_PROJECTS) {
            Team team = teamByName.get(seedProject.teamName().toLowerCase(Locale.ROOT));
            User author = demoUsers.isEmpty() ? owner : demoUsers.get(0);
            ensureProject(seedProject, workspaceId, author, team, demoUsers);
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
        WorkspaceRole ownerRole = upsertSystemRole(workspaceId, "Owner", WorkspaceRolePermissions.ownerDefaults(), owner, byName.get("owner"));
        WorkspaceRole managerRole = upsertSystemRole(workspaceId, "Manager", WorkspaceRolePermissions.managerDefaults(), owner, byName.get("manager"));
        WorkspaceRole memberRole = upsertSystemRole(workspaceId, "Member", WorkspaceRolePermissions.memberDefaults(), owner, byName.get("member"));
        WorkspaceRole viewerRole = upsertSystemRole(workspaceId, "Viewer", WorkspaceRolePermissions.viewerDefaults(), owner, byName.get("viewer"));
        return Map.of(
            "owner", ownerRole,
            "manager", managerRole,
            "member", memberRole,
            "viewer", viewerRole
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

    private void ensureProject(SeedProject seed, String workspaceId, User author, Team team, List<User> members) {
        Optional<Project> existing = projectRepository.findByWorkspaceIdAndName(workspaceId, seed.name());
        Project project = existing.orElseGet(Project::new);
        project.setName(seed.name());
        project.setDescription(seed.description());
        project.setStatus(seed.status());
        project.setWorkspaceId(workspaceId);
        if (project.getCreatedAt() == null) {
            project.setCreatedAt(Instant.now());
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
        projectRepository.save(project);
    }

    private void ensurePendingJoinRequest(String workspaceId) {
        SeedUser pendingSeed = new SeedUser("Ivan", "Petrov", "Project Management", "Member");
        User user = ensureDemoUser(pendingSeed, workspaceId);
        if (user.getId() == null) {
            return;
        }
        if (workspaceJoinRequestRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId()).isPresent()) {
            return;
        }
        if (workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId()).isPresent()) {
            return;
        }
        WorkspaceJoinRequest request = new WorkspaceJoinRequest();
        request.setWorkspaceId(workspaceId);
        request.setUserId(user.getId());
        request.setStatus(WorkspaceJoinRequestStatus.PENDING);
        request.setCreatedAt(Instant.now());
        workspaceJoinRequestRepository.save(request);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(workspaceId);
        member.setUserId(user.getId());
        member.setRole(WorkspaceMemberRole.MEMBER);
        member.setStatus(WorkspaceMemberStatus.PENDING);
        member.setCreatedAt(Instant.now());
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
            int number = ThreadLocalRandom.current().nextInt(1, 1001);
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

    private record SeedUser(String firstName, String lastName, String teamName, String roleName) {
    }

    private record SeedProject(String name, String description, ProjectStatus status, String teamName) {
    }
}
