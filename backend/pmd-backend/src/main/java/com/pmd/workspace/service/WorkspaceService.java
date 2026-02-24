package com.pmd.workspace.service;

import com.pmd.user.model.User;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import com.pmd.workspace.repository.WorkspaceInviteRepository;
import com.pmd.workspace.repository.WorkspaceJoinRequestRepository;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import com.pmd.team.repository.TeamRepository;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.dto.TeamRequest;
import com.pmd.team.service.TeamService;
import com.pmd.workspace.dto.WorkspaceCreateRequest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.stream.Stream;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkspaceService {

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern TRIM_DASH = Pattern.compile("(^-+|-+$)");
    private static final int MAX_CUSTOM_ROLES_PER_WORKSPACE = 10;

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final WorkspaceJoinRequestRepository workspaceJoinRequestRepository;
    private final WorkspaceRoleRepository workspaceRoleRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final TeamService teamService;
    private final DemoWorkspaceSeeder demoWorkspaceSeeder;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository workspaceMemberRepository,
                            WorkspaceInviteRepository workspaceInviteRepository,
                            WorkspaceJoinRequestRepository workspaceJoinRequestRepository,
                            WorkspaceRoleRepository workspaceRoleRepository,
                            TeamRepository teamRepository,
                            ProjectRepository projectRepository,
                            TeamService teamService,
                            DemoWorkspaceSeeder demoWorkspaceSeeder) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceInviteRepository = workspaceInviteRepository;
        this.workspaceJoinRequestRepository = workspaceJoinRequestRepository;
        this.workspaceRoleRepository = workspaceRoleRepository;
        this.teamRepository = teamRepository;
        this.projectRepository = projectRepository;
        this.teamService = teamService;
        this.demoWorkspaceSeeder = demoWorkspaceSeeder;
    }

    public WorkspaceMembership createWorkspace(String name,
                                               List<WorkspaceCreateRequest.WorkspaceInitialTeam> initialTeams,
                                               User creator) {
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
        workspace.setRequireApproval(false);
        workspace.setMaxProjects(null);
        workspace.setMaxMembers(null);
        workspace.setMaxTeams(null);
        workspace.setMaxStorageMb(null);
        Workspace saved = workspaceRepository.save(workspace);

        Map<String, WorkspaceRole> roles = ensureDefaultRoles(saved.getId(), creator);
        WorkspaceRole ownerRole = roles.get("owner");

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(saved.getId());
        member.setUserId(creator != null ? creator.getId() : null);
        member.setRole(WorkspaceMemberRole.OWNER);
        if (ownerRole != null) {
            member.setRoleId(ownerRole.getId());
            member.setDisplayRoleName(ownerRole.getName());
        } else {
            member.setDisplayRoleName("Owner");
        }
        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        member.setCreatedAt(now);
        member.setJoinedAt(now);
        WorkspaceMember savedMember = workspaceMemberRepository.save(member);

        createInitialTeams(saved.getId(), creator, initialTeams);
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

    public WorkspaceMembership joinWorkspace(String inviteInput, User user) {
        WorkspaceInvite invite = resolveInvite(inviteInput);
        Instant now = Instant.now();
        if (invite.getInvitedEmail() != null && user != null) {
            String email = user.getEmail();
            if (email == null || !invite.getInvitedEmail().equalsIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invite does not match this user");
            }
        }
        Workspace workspace = workspaceRepository.findById(invite.getWorkspaceId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        Optional<WorkspaceMember> existing = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspace.getId(), user.getId());
        if (existing.isPresent() && existing.get().getStatus() == WorkspaceMemberStatus.ACTIVE) {
            return new WorkspaceMembership(workspace, existing.get());
        }

        WorkspaceRole roleFromInvite = resolveInviteRole(workspace.getId(), invite.getDefaultRoleId());
        Map<String, WorkspaceRole> roles = ensureDefaultRoles(workspace.getId(), user);
        WorkspaceRole memberRole = roleFromInvite != null ? roleFromInvite : roles.get("member");

        WorkspaceMember member = existing.orElseGet(WorkspaceMember::new);
        member.setWorkspaceId(workspace.getId());
        member.setUserId(user.getId());
        member.setRole(WorkspaceMemberRole.MEMBER);
        if (memberRole != null) {
            member.setRoleId(memberRole.getId());
            member.setDisplayRoleName(memberRole.getName());
        } else {
            member.setDisplayRoleName("Member");
        }

        if (workspace.isRequireApproval()) {
            member.setStatus(WorkspaceMemberStatus.PENDING);
            member.setCreatedAt(member.getCreatedAt() != null ? member.getCreatedAt() : now);
            WorkspaceMember savedMember = workspaceMemberRepository.save(member);
            createJoinRequest(workspace.getId(), user, now);
            return new WorkspaceMembership(workspace, savedMember);
        }

        enforceMemberActivationLimit(workspace.getId());
        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        member.setCreatedAt(member.getCreatedAt() != null ? member.getCreatedAt() : now);
        if (member.getJoinedAt() == null) {
            member.setJoinedAt(now);
        }
        WorkspaceMember savedMember = workspaceMemberRepository.save(member);
        incrementInviteUses(invite);
        return new WorkspaceMembership(workspace, savedMember);
    }

    public WorkspaceInvite createInvite(String workspaceId, User requester, Instant expiresAt, Integer maxUses, String defaultRoleId) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.INVITE_MEMBERS);
        if (maxUses != null && maxUses < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Max uses must be at least 1");
        }
        WorkspaceRole roleFromInvite = resolveInviteRole(workspaceId, defaultRoleId);
        WorkspaceInvite invite = new WorkspaceInvite();
        invite.setWorkspaceId(workspaceId);
        invite.setToken(generateToken());
        invite.setCode(generateInviteCode());
        invite.setDefaultRoleId(roleFromInvite != null ? roleFromInvite.getId() : null);
        invite.setExpiresAt(expiresAt != null ? expiresAt : Instant.now().plus(7, ChronoUnit.DAYS));
        invite.setMaxUses(maxUses != null ? maxUses : 10);
        invite.setUsesCount(0);
        invite.setRevoked(false);
        invite.setCreatedAt(Instant.now());
        invite.setCreatedByUserId(requester.getId());
        return workspaceInviteRepository.save(invite);
    }

    public List<WorkspaceInvite> listInvites(String workspaceId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.INVITE_MEMBERS);
        return workspaceInviteRepository.findAll().stream()
            .filter(invite -> workspaceId.equals(invite.getWorkspaceId()))
            .sorted(Comparator.comparing(WorkspaceInvite::getCreatedAt).reversed())
            .toList();
    }

    public WorkspaceInvite revokeInvite(String workspaceId, String inviteId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.INVITE_MEMBERS);
        WorkspaceInvite invite = workspaceInviteRepository.findById(inviteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found"));
        if (!workspaceId.equals(invite.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found");
        }
        invite.setRevoked(true);
        return workspaceInviteRepository.save(invite);
    }

    public WorkspaceInvite resolveInvite(String inviteInput) {
        if (inviteInput == null || inviteInput.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite token is required");
        }
        String trimmed = inviteInput.trim();
        WorkspaceInvite invite = workspaceInviteRepository.findByToken(trimmed)
            .orElseGet(() -> workspaceInviteRepository.findByCode(trimmed)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found")));
        validateInvite(invite);
        return invite;
    }

    public List<WorkspaceRole> listRoles(String workspaceId, User requester) {
        requireActiveMembership(workspaceId, requester);
        return workspaceRoleRepository.findByWorkspaceId(workspaceId).stream()
            .sorted(Comparator.comparing(WorkspaceRole::getName, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    public WorkspaceRole createRole(String workspaceId, String name, WorkspaceRolePermissions permissions, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.MANAGE_ROLES);
        String trimmed = name != null ? name.trim() : "";
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role name is required");
        }
        long customRoles = workspaceRoleRepository.findByWorkspaceIdAndIsSystem(workspaceId, false).size();
        if (customRoles >= MAX_CUSTOM_ROLES_PER_WORKSPACE) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Custom role limit reached (10 per workspace)"
            );
        }
        if (workspaceRoleRepository.findByWorkspaceIdAndNameIgnoreCase(workspaceId, trimmed).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role name already exists");
        }
        WorkspaceRole role = new WorkspaceRole();
        role.setWorkspaceId(workspaceId);
        role.setName(trimmed);
        role.setSystem(false);
        role.setPermissions(permissions != null ? permissions : WorkspaceRolePermissions.memberDefaults());
        role.setCreatedAt(Instant.now());
        role.setCreatedByUserId(requester != null ? requester.getId() : null);
        return workspaceRoleRepository.save(role);
    }

    public WorkspaceRole updateRole(String workspaceId, String roleId, String name,
                                    WorkspaceRolePermissions permissions, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.MANAGE_ROLES);
        WorkspaceRole role = workspaceRoleRepository.findById(roleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (!workspaceId.equals(role.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
        }
        if (name != null) {
            String trimmed = name.trim();
            if (trimmed.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role name is required");
            }
            if (!trimmed.equalsIgnoreCase(role.getName())
                && workspaceRoleRepository.findByWorkspaceIdAndNameIgnoreCase(workspaceId, trimmed).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Role name already exists");
            }
            role.setName(trimmed);
        }
        if (permissions != null) {
            role.setPermissions(permissions);
        }
        return workspaceRoleRepository.save(role);
    }

    public WorkspaceMember assignMemberRole(String workspaceId, String userId, String roleId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.MANAGE_ROLES);
        WorkspaceRole role = workspaceRoleRepository.findById(roleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (!workspaceId.equals(role.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
        }
        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Member not found"));
        member.setRoleId(role.getId());
        member.setDisplayRoleName(role.getName());
        member.setRole(mapRoleEnum(role.getName()));
        return workspaceMemberRepository.save(member);
    }

    public List<WorkspaceJoinRequest> listPendingRequests(String workspaceId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.APPROVE_JOIN_REQUESTS);
        return workspaceJoinRequestRepository.findByWorkspaceIdAndStatus(
            workspaceId, WorkspaceJoinRequestStatus.PENDING);
    }

    public WorkspaceJoinRequest approveRequest(String workspaceId, String requestId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.APPROVE_JOIN_REQUESTS);
        WorkspaceJoinRequest request = workspaceJoinRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!workspaceId.equals(request.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        }
        request.setStatus(WorkspaceJoinRequestStatus.APPROVED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(requester.getId());
        workspaceJoinRequestRepository.save(request);
        WorkspaceMember joiner = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspaceId, request.getUserId())
            .orElseGet(WorkspaceMember::new);
        joiner.setWorkspaceId(workspaceId);
        joiner.setUserId(request.getUserId());
        if (joiner.getRoleId() == null) {
            joiner.setRole(WorkspaceMemberRole.MEMBER);
            WorkspaceRole memberRole = ensureDefaultRoles(workspaceId, requester).get("member");
            if (memberRole != null) {
                joiner.setRoleId(memberRole.getId());
                joiner.setDisplayRoleName(memberRole.getName());
            } else {
                joiner.setDisplayRoleName("Member");
            }
        }
        enforceMemberActivationLimit(workspaceId);
        joiner.setStatus(WorkspaceMemberStatus.ACTIVE);
        if (joiner.getCreatedAt() == null) {
            joiner.setCreatedAt(request.getCreatedAt());
        }
        if (joiner.getJoinedAt() == null) {
            joiner.setJoinedAt(Instant.now());
        }
        workspaceMemberRepository.save(joiner);
        return request;
    }

    public WorkspaceJoinRequest denyRequest(String workspaceId, String requestId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.APPROVE_JOIN_REQUESTS);
        WorkspaceJoinRequest request = workspaceJoinRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!workspaceId.equals(request.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        }
        request.setStatus(WorkspaceJoinRequestStatus.DENIED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(requester.getId());
        workspaceJoinRequestRepository.save(request);
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, request.getUserId())
            .ifPresent(workspaceMemberRepository::delete);
        return request;
    }

    public WorkspaceMembership updateSettings(
        String workspaceId,
        Boolean requireApproval,
        String name,
        String slug,
        String description,
        String language,
        String avatarUrl,
        Integer maxProjects,
        Integer maxMembers,
        Integer maxTeams,
        Integer maxStorageMb,
        User requester
    ) {
        WorkspaceMember member = requireWorkspacePermission(requester, workspaceId, WorkspacePermission.MANAGE_WORKSPACE_SETTINGS);
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        if (requireApproval != null) {
            workspace.setRequireApproval(requireApproval);
        }
        if (name != null) {
            String trimmed = name.trim();
            if (trimmed.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name is required");
            }
            if (!trimmed.equalsIgnoreCase(workspace.getName())
                && workspaceRepository.existsByNameIgnoreCaseAndIdNot(trimmed, workspace.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace name already exists");
            }
            workspace.setName(trimmed);
        }
        if (slug != null) {
            String normalized = slugify(slug);
            if (normalized.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace slug is invalid");
            }
            if (!normalized.equalsIgnoreCase(workspace.getSlug())
                && workspaceRepository.existsBySlugAndIdNot(normalized, workspace.getId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace slug already exists");
            }
            workspace.setSlug(normalized);
        }
        if (description != null) {
            workspace.setDescription(description.trim());
        }
        if (language != null) {
            workspace.setLanguage(language.trim());
        }
        if (avatarUrl != null) {
            workspace.setAvatarUrl(avatarUrl.trim());
        }
        if (maxProjects != null) {
            workspace.setMaxProjects(normalizeLimit(maxProjects, "Max projects"));
        }
        if (maxMembers != null) {
            workspace.setMaxMembers(normalizeLimit(maxMembers, "Max members"));
        }
        if (maxTeams != null) {
            workspace.setMaxTeams(normalizeLimit(maxTeams, "Max teams"));
        }
        if (maxStorageMb != null) {
            workspace.setMaxStorageMb(normalizeLimit(maxStorageMb, "Max storage"));
        }
        Workspace saved = workspaceRepository.save(workspace);
        return new WorkspaceMembership(saved, member);
    }

    public void enforceProjectCreationLimit(String workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        Integer limit = workspace.getMaxProjects();
        if (limit == null || limit <= 0) return;
        long count = projectRepository.findByWorkspaceId(workspaceId, org.springframework.data.domain.Sort.unsorted()).size();
        if (count >= limit) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace project limit reached");
        }
    }

    public void enforceTeamCreationLimit(String workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        Integer limit = workspace.getMaxTeams();
        if (limit == null || limit <= 0) return;
        long count = teamRepository.findByWorkspaceId(workspaceId).size();
        if (count >= limit) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace team limit reached");
        }
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
            created.setRequireApproval(true);
            workspace = workspaceRepository.save(created);
        }
        Workspace finalWorkspace = workspace;
        Map<String, WorkspaceRole> roles = ensureDefaultRoles(finalWorkspace.getId(), user);
        WorkspaceRole ownerRole = roles.get("owner");
        WorkspaceMember member = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(finalWorkspace.getId(), user.getId())
            .orElseGet(() -> {
                WorkspaceMember created = new WorkspaceMember();
                created.setWorkspaceId(finalWorkspace.getId());
                created.setUserId(user.getId());
                created.setRole(WorkspaceMemberRole.OWNER);
                if (ownerRole != null) {
                    created.setRoleId(ownerRole.getId());
                    created.setDisplayRoleName(ownerRole.getName());
                } else {
                    created.setDisplayRoleName("Owner");
                }
                created.setStatus(WorkspaceMemberStatus.ACTIVE);
                created.setCreatedAt(Instant.now());
                created.setJoinedAt(Instant.now());
                return workspaceMemberRepository.save(created);
            });
        demoWorkspaceSeeder.seedWorkspace(finalWorkspace.getId(), user);
        return new WorkspaceMembership(finalWorkspace, member);
    }

    public void resetDemoWorkspace(String workspaceId, User requester) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        if (!workspace.isDemo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace is not demo");
        }
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.MANAGE_WORKSPACE_SETTINGS);
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
        if (user.isAdmin()) {
            if (!workspaceRepository.existsById(workspaceId)) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found");
            }
            WorkspaceMember adminMember = new WorkspaceMember();
            adminMember.setWorkspaceId(workspaceId);
            adminMember.setUserId(user.getId());
            adminMember.setRole(WorkspaceMemberRole.OWNER);
            adminMember.setDisplayRoleName("Platform Admin");
            adminMember.setStatus(WorkspaceMemberStatus.ACTIVE);
            return adminMember;
        }
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    public WorkspaceMember requireWorkspacePermission(User requester, String workspaceId, WorkspacePermission permission) {
        if (requester == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (requester.isAdmin()) {
            return requireActiveMembership(workspaceId, requester);
        }
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        WorkspaceRolePermissions permissions = resolveMemberPermissions(workspaceId, member);
        if (permissions == null || !permissions.allows(permission)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        return member;
    }

    public WorkspaceRolePermissions resolveMemberPermissions(String workspaceId, WorkspaceMember member) {
        if (member == null) {
            return null;
        }
        if (member.getRoleId() != null) {
            WorkspaceRole role = workspaceRoleRepository.findById(member.getRoleId()).orElse(null);
            if (role != null && Objects.equals(role.getWorkspaceId(), workspaceId)) {
                return role.getPermissions();
            }
        }
        WorkspaceMemberRole legacyRole = member.getRole();
        if (legacyRole == null) {
            return null;
        }
        return switch (legacyRole) {
            case OWNER -> WorkspaceRolePermissions.ownerDefaults();
            case ADMIN -> WorkspaceRolePermissions.managerDefaults();
            case MEMBER -> WorkspaceRolePermissions.memberDefaults();
        };
    }

    private Map<String, WorkspaceRole> ensureDefaultRoles(String workspaceId, User creator) {
        if (workspaceId == null || workspaceId.isBlank()) {
            return Map.of();
        }
        List<WorkspaceRole> existing = workspaceRoleRepository.findByWorkspaceId(workspaceId);
        Map<String, WorkspaceRole> byName = existing.stream()
            .filter(role -> role.getName() != null)
            .collect(Collectors.toMap(role -> role.getName().toLowerCase(Locale.ROOT), role -> role, (a, b) -> a));
        WorkspaceRole owner = byName.get("owner");
        WorkspaceRole manager = byName.get("manager");
        WorkspaceRole member = byName.get("member");
        WorkspaceRole viewer = byName.get("viewer");
        if (owner == null) {
            owner = createSystemRole(workspaceId, "Owner", WorkspaceRolePermissions.ownerDefaults(), creator);
            byName.put("owner", owner);
        }
        if (manager == null) {
            manager = createSystemRole(workspaceId, "Manager", WorkspaceRolePermissions.managerDefaults(), creator);
            byName.put("manager", manager);
        }
        if (member == null) {
            member = createSystemRole(workspaceId, "Member", WorkspaceRolePermissions.memberDefaults(), creator);
            byName.put("member", member);
        }
        if (viewer == null) {
            viewer = createSystemRole(workspaceId, "Viewer", WorkspaceRolePermissions.viewerDefaults(), creator);
            byName.put("viewer", viewer);
        }
        return byName;
    }

    private WorkspaceRole createSystemRole(String workspaceId, String name, WorkspaceRolePermissions permissions, User creator) {
        WorkspaceRole role = new WorkspaceRole();
        role.setWorkspaceId(workspaceId);
        role.setName(name);
        role.setSystem(true);
        role.setPermissions(permissions);
        role.setCreatedAt(Instant.now());
        role.setCreatedByUserId(creator != null ? creator.getId() : null);
        return workspaceRoleRepository.save(role);
    }

    private void createInitialTeams(String workspaceId, User creator,
                                    List<WorkspaceCreateRequest.WorkspaceInitialTeam> initialTeams) {
        List<String> names = Stream.ofNullable(initialTeams)
            .flatMap(List::stream)
            .map(WorkspaceCreateRequest.WorkspaceInitialTeam::getName)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(name -> !name.isBlank())
            .collect(Collectors.toMap(
                name -> name.toLowerCase(Locale.ROOT),
                name -> name,
                (a, b) -> a
            ))
            .values()
            .stream()
            .toList();
        for (String name : names) {
            try {
                teamService.createTeam(new TeamRequest(name), creator, workspaceId);
            } catch (ResponseStatusException ex) {
                if (ex.getStatusCode() != HttpStatus.CONFLICT) {
                    throw ex;
                }
            }
        }
    }

    private void validateInvite(WorkspaceInvite invite) {
        if (invite.isRevoked()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite revoked");
        }
        Instant now = Instant.now();
        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite expired");
        }
        if (invite.getMaxUses() != null && invite.getUsesCount() >= invite.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite exhausted");
        }
    }

    private void incrementInviteUses(WorkspaceInvite invite) {
        invite.setUsesCount(invite.getUsesCount() + 1);
        if (invite.getMaxUses() != null && invite.getUsesCount() >= invite.getMaxUses()) {
            invite.setRevoked(true);
        }
        workspaceInviteRepository.save(invite);
    }

    private WorkspaceMemberRole mapRoleEnum(String roleName) {
        if (roleName == null) {
            return WorkspaceMemberRole.MEMBER;
        }
        String normalized = roleName.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "owner" -> WorkspaceMemberRole.OWNER;
            case "manager" -> WorkspaceMemberRole.ADMIN;
            case "admin" -> WorkspaceMemberRole.ADMIN;
            default -> WorkspaceMemberRole.MEMBER;
        };
    }

    private WorkspaceRole resolveInviteRole(String workspaceId, String roleId) {
        if (roleId == null || roleId.isBlank()) {
            return null;
        }
        WorkspaceRole role = workspaceRoleRepository.findById(roleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Default role not found"));
        if (!workspaceId.equals(role.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Default role must belong to workspace");
        }
        if ("owner".equalsIgnoreCase(role.getName())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Owner cannot be default invite role");
        }
        return role;
    }

    private void enforceMemberActivationLimit(String workspaceId) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        Integer limit = workspace.getMaxMembers();
        if (limit == null || limit <= 0) return;
        long activeMembers = workspaceMemberRepository.findByWorkspaceId(workspaceId).stream()
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .count();
        if (activeMembers >= limit) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace member limit reached");
        }
    }

    private Integer normalizeLimit(Integer value, String fieldName) {
        if (value == null) return null;
        if (value < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fieldName + " must be >= 0");
        }
        return value == 0 ? null : value;
    }

    private void createJoinRequest(String workspaceId, User user, Instant now) {
        WorkspaceJoinRequest existing = workspaceJoinRequestRepository
            .findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .orElse(null);
        if (existing != null && existing.getStatus() == WorkspaceJoinRequestStatus.PENDING) {
            return;
        }
        WorkspaceJoinRequest request = new WorkspaceJoinRequest();
        request.setWorkspaceId(workspaceId);
        request.setUserId(user.getId());
        request.setStatus(WorkspaceJoinRequestStatus.PENDING);
        request.setCreatedAt(now);
        workspaceJoinRequestRepository.save(request);
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    private String generateInviteCode() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder builder = new StringBuilder("PMD-");
        for (int i = 0; i < 6; i++) {
            int idx = ThreadLocalRandom.current().nextInt(alphabet.length());
            builder.append(alphabet.charAt(idx));
        }
        return builder.toString();
    }

    public Optional<WorkspaceMember> findMembership(String workspaceId, String userId) {
        if (workspaceId == null || userId == null) {
            return Optional.empty();
        }
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId);
    }

    public Workspace getWorkspaceById(String workspaceId) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found");
        }
        return workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    public String findWorkspaceName(String workspaceId) {
        if (workspaceId == null) {
            return null;
        }
        return workspaceRepository.findById(workspaceId)
            .map(Workspace::getName)
            .orElse(null);
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
