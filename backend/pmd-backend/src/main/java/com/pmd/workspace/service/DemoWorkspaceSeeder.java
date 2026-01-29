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
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
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
        new SeedUser("Alex", "Johnson", "Web Development"),
        new SeedUser("Bianca", "Lopez", "Software Engineering"),
        new SeedUser("Chris", "Nguyen", "Data Engineering"),
        new SeedUser("Dana", "Rossi", "DevOps"),
        new SeedUser("Evan", "Kim", "UX / UI Design")
    );

    private static final List<SeedProject> SEED_PROJECTS = List.of(
        new SeedProject("Launchpad Revamp", "Modernize the internal project hub", ProjectStatus.IN_PROGRESS, "Web Development"),
        new SeedProject("Data Lake Hardening", "Improve lineage and quality checks", ProjectStatus.NOT_STARTED, "Data Engineering"),
        new SeedProject("QA Automation Sprint", "Expand automated regression suite", ProjectStatus.IN_PROGRESS, "QA / Testing"),
        new SeedProject("DevOps Control Plane", "Standardize deployment playbooks", ProjectStatus.NOT_STARTED, "DevOps"),
        new SeedProject("Design System Refresh", "Unify UI tokens and components", ProjectStatus.COMPLETED, "UX / UI Design")
    );

    private final TeamRepository teamRepository;
    private final TeamService teamService;
    private final UserService userService;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final PersonRepository personRepository;
    private final ProjectRepository projectRepository;
    private final ProjectCommentRepository projectCommentRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoWorkspaceSeeder(TeamRepository teamRepository,
                               TeamService teamService,
                               UserService userService,
                               UserRepository userRepository,
                               WorkspaceMemberRepository workspaceMemberRepository,
                               PersonRepository personRepository,
                               ProjectRepository projectRepository,
                               ProjectCommentRepository projectCommentRepository,
                               PasswordEncoder passwordEncoder) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.userService = userService;
        this.userRepository = userRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
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
    }

    public void seedWorkspace(String workspaceId, User owner) {
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
            ensureMembership(workspaceId, user, WorkspaceMemberRole.MEMBER);
            demoUsers.add(user);
            ensurePersonRecord(seed, workspaceId, user);
        }
        if (owner != null) {
            ensureMembership(workspaceId, owner, WorkspaceMemberRole.OWNER);
        }

        for (SeedProject seedProject : SEED_PROJECTS) {
            Team team = teamByName.get(seedProject.teamName().toLowerCase(Locale.ROOT));
            User author = demoUsers.isEmpty() ? owner : demoUsers.get(0);
            ensureProject(seedProject, workspaceId, author, team, demoUsers);
        }
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

    private void ensureMembership(String workspaceId, User user, WorkspaceMemberRole role) {
        if (user == null || user.getId() == null) {
            return;
        }
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .orElseGet(() -> {
                WorkspaceMember member = new WorkspaceMember();
                member.setWorkspaceId(workspaceId);
                member.setUserId(user.getId());
                member.setRole(role);
                member.setStatus(WorkspaceMemberStatus.ACTIVE);
                member.setCreatedAt(Instant.now());
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

    private String buildDemoEmail(SeedUser seed, String workspaceId) {
        String base = (seed.firstName() + "." + seed.lastName()).toLowerCase(Locale.ROOT).replace(" ", "");
        return base + "+" + workspaceId + "@pmd.local";
    }

    private record SeedUser(String firstName, String lastName, String teamName) {
    }

    private record SeedProject(String name, String description, ProjectStatus status, String teamName) {
    }
}
