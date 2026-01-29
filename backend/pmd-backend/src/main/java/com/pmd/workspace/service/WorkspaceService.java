package com.pmd.workspace.service;

import com.pmd.user.model.User;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.repository.WorkspaceInviteRepository;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkspaceService {

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern TRIM_DASH = Pattern.compile("(^-+|-+$)");

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final DemoWorkspaceSeeder demoWorkspaceSeeder;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository workspaceMemberRepository,
                            WorkspaceInviteRepository workspaceInviteRepository,
                            DemoWorkspaceSeeder demoWorkspaceSeeder) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceInviteRepository = workspaceInviteRepository;
        this.demoWorkspaceSeeder = demoWorkspaceSeeder;
    }

    public WorkspaceMembership createWorkspace(String name, User creator) {
        String trimmed = name != null ? name.trim() : "";
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name is required");
        }
        if (workspaceRepository.existsByNameIgnoreCase(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace name already exists");
        }
        String slug = slugify(trimmed);
        if (slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid workspace name");
        }
        if (workspaceRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace slug already exists");
        }
        Instant now = Instant.now();
        Workspace workspace = new Workspace();
        workspace.setName(trimmed);
        workspace.setSlug(slug);
        workspace.setCreatedAt(now);
        workspace.setCreatedByUserId(creator != null ? creator.getId() : null);
        workspace.setDemo(false);
        Workspace saved = workspaceRepository.save(workspace);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(saved.getId());
        member.setUserId(creator != null ? creator.getId() : null);
        member.setRole(WorkspaceMemberRole.OWNER);
        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        member.setCreatedAt(now);
        WorkspaceMember savedMember = workspaceMemberRepository.save(member);
        return new WorkspaceMembership(saved, savedMember);
    }

    public List<WorkspaceMembership> listWorkspacesFor(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        List<WorkspaceMember> memberships = workspaceMemberRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<String> workspaceIds = memberships.stream()
            .map(WorkspaceMember::getWorkspaceId)
            .distinct()
            .toList();
        Map<String, Workspace> workspacesById = workspaceRepository.findAllById(workspaceIds).stream()
            .collect(Collectors.toMap(Workspace::getId, workspace -> workspace));
        return memberships.stream()
            .map(member -> new WorkspaceMembership(workspacesById.get(member.getWorkspaceId()), member))
            .filter(membership -> membership.workspace() != null)
            .sorted(Comparator.comparing(membership -> membership.workspace().getName(), String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    public WorkspaceMembership joinWorkspace(String token, User user) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite token is required");
        }
        WorkspaceInvite invite = workspaceInviteRepository.findByToken(token.trim())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found"));
        Instant now = Instant.now();
        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite expired");
        }
        if (invite.getInvitedEmail() != null && user != null) {
            String email = user.getEmail();
            if (email == null || !invite.getInvitedEmail().equalsIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invite does not match this user");
            }
        }
        Workspace workspace = workspaceRepository.findById(invite.getWorkspaceId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        WorkspaceMember member = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspace.getId(), user.getId())
            .orElseGet(() -> {
                WorkspaceMember created = new WorkspaceMember();
                created.setWorkspaceId(workspace.getId());
                created.setUserId(user.getId());
                created.setRole(WorkspaceMemberRole.MEMBER);
                created.setStatus(WorkspaceMemberStatus.ACTIVE);
                created.setCreatedAt(now);
                return workspaceMemberRepository.save(created);
            });
        workspaceInviteRepository.delete(invite);
        return new WorkspaceMembership(workspace, member);
    }

    public WorkspaceMembership getOrCreateDemoWorkspace(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        String slug = "demo-" + user.getId();
        Workspace workspace = workspaceRepository.findBySlug(slug).orElse(null);
        if (workspace == null) {
            Workspace created = new Workspace();
            created.setName("Demo Workspace");
            created.setSlug(slug);
            created.setCreatedAt(Instant.now());
            created.setCreatedByUserId(user.getId());
            created.setDemo(true);
            workspace = workspaceRepository.save(created);
        }
        WorkspaceMember member = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspace.getId(), user.getId())
            .orElseGet(() -> {
                WorkspaceMember created = new WorkspaceMember();
                created.setWorkspaceId(workspace.getId());
                created.setUserId(user.getId());
                created.setRole(WorkspaceMemberRole.OWNER);
                created.setStatus(WorkspaceMemberStatus.ACTIVE);
                created.setCreatedAt(Instant.now());
                return workspaceMemberRepository.save(created);
            });
        demoWorkspaceSeeder.seedWorkspace(workspace.getId(), user);
        return new WorkspaceMembership(workspace, member);
    }

    public void resetDemoWorkspace(String workspaceId, User requester) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        if (!workspace.isDemo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace is not demo");
        }
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!(member.getRole() == WorkspaceMemberRole.OWNER || member.getRole() == WorkspaceMemberRole.ADMIN)
            && !requester.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        demoWorkspaceSeeder.resetWorkspaceData(workspaceId);
        demoWorkspaceSeeder.seedWorkspace(workspaceId, requester);
    }

    public WorkspaceMember requireActiveMembership(String workspaceId, User user) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace is required");
        }
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    public Optional<WorkspaceMember> findMembership(String workspaceId, String userId) {
        if (workspaceId == null || userId == null) {
            return Optional.empty();
        }
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId);
    }

    public String slugify(String input) {
        if (input == null) {
            return "";
        }
        String lower = input.trim().toLowerCase(Locale.ROOT);
        String dashed = NON_ALNUM.matcher(lower).replaceAll("-");
        return TRIM_DASH.matcher(dashed).replaceAll("");
    }

    public record WorkspaceMembership(Workspace workspace, WorkspaceMember member) {
    }
}
