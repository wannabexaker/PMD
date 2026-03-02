package com.pmd.workspace.service;

import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import com.pmd.mention.repository.MentionAuditEventRepository;
import com.pmd.mention.repository.MentionRestrictionRepository;
import com.pmd.notification.repository.WorkspaceInviteAcceptedDigestRepository;
import com.pmd.notification.repository.WorkspaceJoinRequestEmailThrottleRepository;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.dto.WorkspaceDeletePreviewResponse;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.model.WorkspaceRoleBadge;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import com.pmd.workspace.repository.WorkspaceInviteRepository;
import com.pmd.workspace.repository.WorkspaceJoinRequestRepository;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import com.pmd.workspace.preferences.WorkspacePanelPreferencesRepository;
import com.pmd.team.repository.TeamRepository;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.dto.TeamRequest;
import com.pmd.team.service.TeamService;
import com.pmd.workspace.dto.WorkspaceCreateRequest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Objects;
import java.util.LinkedHashSet;
import java.util.stream.Stream;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkspaceService {

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern TRIM_DASH = Pattern.compile("(^-+|-+$)");
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final Pattern HEX_COLOR_PATTERN = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final int MAX_CUSTOM_ROLES_PER_WORKSPACE = 10;
    private static final int MAX_INVITE_QUESTION_LENGTH = 280;
    private static final int MAX_INVITE_ANSWER_LENGTH = 560;
    private static final int MAX_ROLE_BADGE_LABEL_LENGTH = 24;
    private static final long WORKSPACE_DELETE_GRACE_MINUTES = 30;
    private static final int DEMO_NUMBER_MAX = 9999;
    private static final String DEMO_WORKSPACE_NAME_PREFIX = "Demo Workspace";
    private static final String DEFAULT_ROLE_BADGE_COLOR = "#6366F1";
    private static final Map<String, String> SYSTEM_ROLE_BADGE_COLORS = Map.of(
        "owner", "#DC2626",
        "manager", "#EA580C",
        "member", "#2563EB",
        "viewer", "#4B5563"
    );

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final WorkspaceJoinRequestRepository workspaceJoinRequestRepository;
    private final WorkspaceRoleRepository workspaceRoleRepository;
    private final TeamRepository teamRepository;
    private final ProjectRepository projectRepository;
    private final WorkspaceAuditEventRepository workspaceAuditEventRepository;
    private final MentionAuditEventRepository mentionAuditEventRepository;
    private final MentionRestrictionRepository mentionRestrictionRepository;
    private final WorkspacePanelPreferencesRepository workspacePanelPreferencesRepository;
    private final WorkspaceInviteAcceptedDigestRepository workspaceInviteAcceptedDigestRepository;
    private final WorkspaceJoinRequestEmailThrottleRepository workspaceJoinRequestEmailThrottleRepository;
    private final TeamService teamService;
    private final DemoWorkspaceSeeder demoWorkspaceSeeder;
    private final WorkspaceInviteNotificationService workspaceInviteNotificationService;
    private final UserService userService;
    private static final Logger logger = LoggerFactory.getLogger(WorkspaceService.class);

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository workspaceMemberRepository,
                            WorkspaceInviteRepository workspaceInviteRepository,
                            WorkspaceJoinRequestRepository workspaceJoinRequestRepository,
                            WorkspaceRoleRepository workspaceRoleRepository,
                            TeamRepository teamRepository,
                            ProjectRepository projectRepository,
                            WorkspaceAuditEventRepository workspaceAuditEventRepository,
                            MentionAuditEventRepository mentionAuditEventRepository,
                            MentionRestrictionRepository mentionRestrictionRepository,
                            WorkspacePanelPreferencesRepository workspacePanelPreferencesRepository,
                            WorkspaceInviteAcceptedDigestRepository workspaceInviteAcceptedDigestRepository,
                            WorkspaceJoinRequestEmailThrottleRepository workspaceJoinRequestEmailThrottleRepository,
                            TeamService teamService,
                            DemoWorkspaceSeeder demoWorkspaceSeeder,
                            WorkspaceInviteNotificationService workspaceInviteNotificationService,
                            UserService userService) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceInviteRepository = workspaceInviteRepository;
        this.workspaceJoinRequestRepository = workspaceJoinRequestRepository;
        this.workspaceRoleRepository = workspaceRoleRepository;
        this.teamRepository = teamRepository;
        this.projectRepository = projectRepository;
        this.workspaceAuditEventRepository = workspaceAuditEventRepository;
        this.mentionAuditEventRepository = mentionAuditEventRepository;
        this.mentionRestrictionRepository = mentionRestrictionRepository;
        this.workspacePanelPreferencesRepository = workspacePanelPreferencesRepository;
        this.workspaceInviteAcceptedDigestRepository = workspaceInviteAcceptedDigestRepository;
        this.workspaceJoinRequestEmailThrottleRepository = workspaceJoinRequestEmailThrottleRepository;
        this.teamService = teamService;
        this.demoWorkspaceSeeder = demoWorkspaceSeeder;
        this.workspaceInviteNotificationService = workspaceInviteNotificationService;
        this.userService = userService;
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
        setMemberPrimaryRole(member, ownerRole, "Owner");
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

    public WorkspaceDeletePreviewResponse getWorkspaceDeletePreview(String workspaceId, User requester) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        requireWorkspaceDeletePermission(workspace, requester);

        List<WorkspaceMember> members = workspaceMemberRepository.findByWorkspaceId(workspaceId);
        long activeMembers = members.stream()
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .count();
        long totalMembers = members.size();
        long projectCount = projectRepository.countByWorkspaceId(workspaceId);
        long teamCount = teamRepository.countByWorkspaceId(workspaceId);
        long pendingJoinRequests = workspaceJoinRequestRepository.countByWorkspaceIdAndStatus(
            workspaceId,
            WorkspaceJoinRequestStatus.PENDING
        );
        long activeInvites = countActiveInvites(workspaceId, Instant.now());
        boolean deletionPending = workspace.getDeletionScheduledAt() != null;

        return new WorkspaceDeletePreviewResponse(
            workspace.getId(),
            workspace.getName(),
            activeMembers,
            totalMembers,
            projectCount,
            teamCount,
            pendingJoinRequests,
            activeInvites,
            deletionPending,
            workspace.getDeletionRequestedAt(),
            workspace.getDeletionScheduledAt(),
            WORKSPACE_DELETE_GRACE_MINUTES
        );
    }

    public WorkspaceDeletePreviewResponse requestWorkspaceDeletion(String workspaceId, String confirmName, User requester) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        requireWorkspaceDeletePermission(workspace, requester);

        String expectedName = workspace.getName() != null ? workspace.getName().trim() : "";
        String normalizedConfirmName = confirmName != null ? confirmName.trim() : "";
        if (expectedName.isBlank() || !expectedName.equals(normalizedConfirmName)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name confirmation does not match");
        }

        if (workspace.getDeletionScheduledAt() == null) {
            Instant now = Instant.now();
            Instant scheduledAt = now.plus(WORKSPACE_DELETE_GRACE_MINUTES, ChronoUnit.MINUTES);
            workspace.setDeletionRequestedAt(now);
            workspace.setDeletionScheduledAt(scheduledAt);
            workspace.setDeletionRequestedByUserId(requester != null ? requester.getId() : null);
            workspaceRepository.save(workspace);
            workspaceInviteNotificationService.notifyWorkspaceDeletionScheduled(workspace, requester, scheduledAt);
        }

        return getWorkspaceDeletePreview(workspaceId, requester);
    }

    public WorkspaceDeletePreviewResponse cancelWorkspaceDeletion(String workspaceId, User requester) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        requireWorkspaceDeletePermission(workspace, requester);

        boolean hadPendingDeletion = workspace.getDeletionScheduledAt() != null;
        workspace.setDeletionRequestedAt(null);
        workspace.setDeletionScheduledAt(null);
        workspace.setDeletionRequestedByUserId(null);
        workspaceRepository.save(workspace);
        if (hadPendingDeletion) {
            workspaceInviteNotificationService.notifyWorkspaceDeletionCanceled(workspace, requester);
        }
        return getWorkspaceDeletePreview(workspaceId, requester);
    }

    @Scheduled(cron = "0 */1 * * * *")
    public void processScheduledWorkspaceDeletions() {
        Instant now = Instant.now();
        List<Workspace> due = workspaceRepository.findByDeletionScheduledAtNotNullAndDeletionScheduledAtLessThanEqual(now);
        if (due.isEmpty()) {
            return;
        }
        for (Workspace workspace : due) {
            if (workspace == null || workspace.getId() == null) {
                continue;
            }
            try {
                purgeWorkspaceData(workspace);
            } catch (RuntimeException ex) {
                logger.error("Failed to finalize scheduled workspace deletion for workspaceId={}", workspace.getId(), ex);
            }
        }
    }

    public WorkspaceMembership joinWorkspace(String inviteInput, String inviteAnswer, User user) {
        WorkspaceInvite invite = resolveInvite(inviteInput);
        Instant now = Instant.now();
        String normalizedInviteAnswer = normalizeInviteAnswer(inviteAnswer);
        validateInviteAnswer(invite, normalizedInviteAnswer);
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
        member.setInvitedByUserId(invite.getCreatedByUserId());
        setMemberPrimaryRole(member, memberRole, "Member");

        if (workspace.isRequireApproval()) {
            member.setStatus(WorkspaceMemberStatus.PENDING);
            member.setCreatedAt(member.getCreatedAt() != null ? member.getCreatedAt() : now);
            WorkspaceMember savedMember = workspaceMemberRepository.save(member);
            WorkspaceJoinRequest joinRequest = createJoinRequest(workspace.getId(), user, now, invite, normalizedInviteAnswer);
            workspaceInviteNotificationService.notifyJoinRequestSubmitted(workspace, joinRequest, user);
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
        User inviter = safeFindUserById(invite.getCreatedByUserId());
        workspaceInviteNotificationService.notifyMemberJoined(workspace, savedMember, user, inviter);
        return new WorkspaceMembership(workspace, savedMember);
    }

    public WorkspaceInvite createInvite(String workspaceId, User requester, Instant expiresAt, Integer maxUses,
                                        String defaultRoleId, String invitedEmail, String joinQuestion) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.INVITE_MEMBERS);
        if (maxUses != null && maxUses < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Max uses must be at least 1");
        }
        WorkspaceRole roleFromInvite = resolveInviteRole(workspaceId, defaultRoleId);
        WorkspaceInvite invite = new WorkspaceInvite();
        invite.setWorkspaceId(workspaceId);
        invite.setToken(generateToken());
        invite.setCode(generateUniqueInviteCode());
        invite.setDefaultRoleId(roleFromInvite != null ? roleFromInvite.getId() : null);
        invite.setExpiresAt(expiresAt != null ? expiresAt : Instant.now().plus(7, ChronoUnit.DAYS));
        invite.setMaxUses(maxUses != null ? maxUses : 10);
        invite.setUsesCount(0);
        invite.setRevoked(false);
        invite.setCreatedAt(Instant.now());
        invite.setCreatedByUserId(requester.getId());
        String normalizedInvitedEmail = invitedEmail != null ? invitedEmail.trim() : null;
        if (normalizedInvitedEmail != null && !normalizedInvitedEmail.isBlank() && !EMAIL_PATTERN.matcher(normalizedInvitedEmail).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite email is invalid");
        }
        invite.setInvitedEmail((normalizedInvitedEmail == null || normalizedInvitedEmail.isBlank()) ? null : normalizedInvitedEmail);
        invite.setJoinQuestion(normalizeInviteQuestion(joinQuestion));
        WorkspaceInvite savedInvite = workspaceInviteRepository.save(invite);
        Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
        workspaceInviteNotificationService.notifyInviteCreated(workspace, savedInvite, requester);
        return savedInvite;
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
        List<WorkspaceRole> roles = workspaceRoleRepository.findByWorkspaceId(workspaceId);
        roles.forEach(role -> {
            boolean changed = false;
            if (role.getBadge() == null) {
                role.setBadge(defaultRoleBadge(role.getName()));
                changed = true;
            }
            if (role.getSchemaVersion() < 2) {
                role.setSchemaVersion(2);
                changed = true;
            }
            if (changed) {
                workspaceRoleRepository.save(role);
            }
        });
        return roles.stream()
            .sorted(Comparator.comparing(WorkspaceRole::getName, String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    public WorkspaceRole createRole(String workspaceId, String name, WorkspaceRolePermissions permissions, User requester) {
        return createRole(workspaceId, name, permissions, null, requester);
    }

    public WorkspaceRole createRole(String workspaceId, String name, WorkspaceRolePermissions permissions,
                                    WorkspaceRoleBadge badge, User requester) {
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
        role.setBadge(normalizeRoleBadge(badge, trimmed));
        role.setCreatedAt(Instant.now());
        role.setCreatedByUserId(requester != null ? requester.getId() : null);
        role.setSchemaVersion(2);
        return workspaceRoleRepository.save(role);
    }

    public WorkspaceRole updateRole(String workspaceId, String roleId, String name,
                                    WorkspaceRolePermissions permissions, User requester) {
        return updateRole(workspaceId, roleId, name, permissions, null, requester);
    }

    public WorkspaceRole updateRole(String workspaceId, String roleId, String name,
                                    WorkspaceRolePermissions permissions, WorkspaceRoleBadge badge, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.MANAGE_ROLES);
        WorkspaceRole role = workspaceRoleRepository.findById(roleId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (!workspaceId.equals(role.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found");
        }
        String effectiveName = role.getName();
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
            effectiveName = trimmed;
        }
        if (permissions != null) {
            role.setPermissions(permissions);
        }
        if (badge != null || role.getBadge() == null) {
            role.setBadge(normalizeRoleBadge(badge != null ? badge : role.getBadge(), effectiveName));
        }
        role.setSchemaVersion(Math.max(role.getSchemaVersion(), 2));
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
        setMemberPrimaryRole(member, role, role.getName());
        return workspaceMemberRepository.save(member);
    }

    public List<WorkspaceJoinRequest> listPendingRequests(String workspaceId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.APPROVE_JOIN_REQUESTS);
        Map<String, WorkspaceJoinRequest> latestByUser = workspaceJoinRequestRepository
            .findByWorkspaceIdAndStatus(workspaceId, WorkspaceJoinRequestStatus.PENDING)
            .stream()
            .collect(Collectors.toMap(
                WorkspaceJoinRequest::getUserId,
                request -> request,
                (left, right) -> {
                    Instant leftAt = left.getCreatedAt() != null ? left.getCreatedAt() : Instant.EPOCH;
                    Instant rightAt = right.getCreatedAt() != null ? right.getCreatedAt() : Instant.EPOCH;
                    return rightAt.isAfter(leftAt) ? right : left;
                }
            ));
        return latestByUser.values().stream()
            .sorted(Comparator.comparing(WorkspaceJoinRequest::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
            .toList();
    }

    public WorkspaceJoinRequest approveRequest(String workspaceId, String requestId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.APPROVE_JOIN_REQUESTS);
        WorkspaceJoinRequest request = workspaceJoinRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!workspaceId.equals(request.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        }
        if (request.getStatus() != WorkspaceJoinRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending");
        }
        request.setStatus(WorkspaceJoinRequestStatus.APPROVED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(requester.getId());
        workspaceJoinRequestRepository.save(request);
        clearDuplicatePendingRequests(workspaceId, request.getUserId(), request.getId(), requester.getId());
        WorkspaceMember joiner = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspaceId, request.getUserId())
            .orElseGet(WorkspaceMember::new);
        joiner.setWorkspaceId(workspaceId);
        joiner.setUserId(request.getUserId());
        if (joiner.getRoleId() == null) {
            WorkspaceRole memberRole = ensureDefaultRoles(workspaceId, requester).get("member");
            setMemberPrimaryRole(joiner, memberRole, "Member");
        }
        enforceMemberActivationLimit(workspaceId);
        joiner.setStatus(WorkspaceMemberStatus.ACTIVE);
        if (joiner.getCreatedAt() == null) {
            joiner.setCreatedAt(request.getCreatedAt());
        }
        if (joiner.getJoinedAt() == null) {
            joiner.setJoinedAt(Instant.now());
        }
        if (joiner.getInvitedByUserId() == null) {
            joiner.setInvitedByUserId(request.getInvitedByUserId());
        }
        WorkspaceMember savedJoiner = workspaceMemberRepository.save(joiner);
        if (request.getInviteId() != null) {
            workspaceInviteRepository.findById(request.getInviteId()).ifPresent(this::incrementInviteUses);
        }
        Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
        User requesterUser = safeFindUserById(request.getUserId());
        workspaceInviteNotificationService.notifyJoinRequestDecision(workspace, request, requesterUser, requester);
        User inviter = safeFindUserById(request.getInvitedByUserId());
        workspaceInviteNotificationService.notifyMemberJoined(workspace, savedJoiner, requesterUser, inviter);
        return request;
    }

    public WorkspaceJoinRequest denyRequest(String workspaceId, String requestId, User requester) {
        requireWorkspacePermission(requester, workspaceId, WorkspacePermission.APPROVE_JOIN_REQUESTS);
        WorkspaceJoinRequest request = workspaceJoinRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!workspaceId.equals(request.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        }
        if (request.getStatus() != WorkspaceJoinRequestStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Request is not pending");
        }
        request.setStatus(WorkspaceJoinRequestStatus.DENIED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(requester.getId());
        workspaceJoinRequestRepository.save(request);
        clearDuplicatePendingRequests(workspaceId, request.getUserId(), request.getId(), requester.getId());
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, request.getUserId())
            .ifPresent(workspaceMemberRepository::delete);
        Workspace workspace = workspaceRepository.findById(workspaceId).orElse(null);
        User requesterUser = safeFindUserById(request.getUserId());
        workspaceInviteNotificationService.notifyJoinRequestDecision(workspace, request, requesterUser, requester);
        return request;
    }

    public void cancelOwnJoinRequest(String workspaceId, User requester) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace is required");
        }
        if (requester == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (!workspaceRepository.existsById(workspaceId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found");
        }
        List<WorkspaceJoinRequest> pendingRequests = workspaceJoinRequestRepository
            .findByWorkspaceIdAndUserIdAndStatus(workspaceId, requester.getId(), WorkspaceJoinRequestStatus.PENDING);
        if (pendingRequests.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Pending request not found");
        }
        Instant now = Instant.now();
        for (WorkspaceJoinRequest request : pendingRequests) {
            request.setStatus(WorkspaceJoinRequestStatus.CANCELED);
            request.setDecidedAt(now);
            request.setDecidedByUserId(requester.getId());
        }
        workspaceJoinRequestRepository.saveAll(pendingRequests);
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requester.getId())
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.PENDING)
            .ifPresent(workspaceMemberRepository::delete);
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
            created.setName(generateUniqueDemoWorkspaceName());
            created.setSlug(slug);
            created.setCreatedAt(Instant.now());
            created.setCreatedByUserId(user.getId());
            created.setDemo(true);
            created.setRequireApproval(true);
            workspace = workspaceRepository.save(created);
        } else if (workspace.isDemo() && (workspace.getName() == null || workspace.getName().trim().equalsIgnoreCase(DEMO_WORKSPACE_NAME_PREFIX))) {
            workspace.setName(generateUniqueDemoWorkspaceName());
            workspace = workspaceRepository.save(workspace);
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
                setMemberPrimaryRole(created, ownerRole, "Owner");
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
            setMemberPrimaryRole(adminMember, null, "Platform Admin");
            adminMember.setRole(WorkspaceMemberRole.OWNER);
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
        role.setBadge(defaultRoleBadge(name));
        role.setCreatedAt(Instant.now());
        role.setCreatedByUserId(creator != null ? creator.getId() : null);
        role.setSchemaVersion(2);
        return workspaceRoleRepository.save(role);
    }

    private WorkspaceRoleBadge normalizeRoleBadge(WorkspaceRoleBadge badge, String roleName) {
        WorkspaceRoleBadge defaults = defaultRoleBadge(roleName);
        String rawLabel = badge != null ? badge.getLabel() : null;
        String rawColor = badge != null ? badge.getColor() : null;
        String label = rawLabel != null ? rawLabel.trim() : "";
        if (label.isBlank()) {
            label = defaults.getLabel();
        }
        if (label.length() > MAX_ROLE_BADGE_LABEL_LENGTH) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Role badge label must be at most " + MAX_ROLE_BADGE_LABEL_LENGTH + " characters"
            );
        }
        String color = rawColor != null ? rawColor.trim() : defaults.getColor();
        if (color.isBlank()) {
            color = defaults.getColor();
        }
        if (!HEX_COLOR_PATTERN.matcher(color).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Role badge color must be a valid hex color");
        }
        return new WorkspaceRoleBadge(label, color.toUpperCase(Locale.ROOT));
    }

    private WorkspaceRoleBadge defaultRoleBadge(String roleName) {
        String normalizedName = roleName != null ? roleName.trim() : "";
        String displayName = normalizedName.isBlank() ? "Role" : normalizedName;
        String color = SYSTEM_ROLE_BADGE_COLORS.getOrDefault(
            normalizedName.toLowerCase(Locale.ROOT),
            DEFAULT_ROLE_BADGE_COLOR
        );
        return new WorkspaceRoleBadge(displayName, color);
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

    private void requireWorkspaceDeletePermission(Workspace workspace, User requester) {
        if (workspace == null || workspace.getId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found");
        }
        if (requester == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        if (requester.isAdmin()) {
            return;
        }
        WorkspaceMember member = requireWorkspacePermission(
            requester,
            workspace.getId(),
            WorkspacePermission.MANAGE_WORKSPACE_SETTINGS
        );
        if (workspace.getCreatedByUserId() != null && Objects.equals(workspace.getCreatedByUserId(), requester.getId())) {
            return;
        }
        if (member.getRole() == WorkspaceMemberRole.OWNER) {
            return;
        }
        if (member.getRoleId() != null) {
            WorkspaceRole role = workspaceRoleRepository.findById(member.getRoleId()).orElse(null);
            if (role != null
                && Objects.equals(role.getWorkspaceId(), workspace.getId())
                && "owner".equalsIgnoreCase(role.getName())) {
                return;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only workspace owner can delete workspace");
    }

    private long countActiveInvites(String workspaceId, Instant now) {
        return workspaceInviteRepository.findByWorkspaceId(workspaceId).stream()
            .filter(invite -> !invite.isRevoked())
            .filter(invite -> invite.getExpiresAt() == null || !invite.getExpiresAt().isBefore(now))
            .filter(invite -> invite.getMaxUses() == null || invite.getUsesCount() < invite.getMaxUses())
            .count();
    }

    private void purgeWorkspaceData(Workspace workspace) {
        String workspaceId = workspace.getId();
        logger.info("Finalizing scheduled deletion for workspaceId={} workspaceName={}", workspaceId, workspace.getName());

        projectRepository.deleteByWorkspaceId(workspaceId);
        teamRepository.deleteByWorkspaceId(workspaceId);
        workspaceInviteRepository.deleteByWorkspaceId(workspaceId);
        workspaceJoinRequestRepository.deleteByWorkspaceId(workspaceId);
        workspaceRoleRepository.deleteByWorkspaceId(workspaceId);
        workspaceMemberRepository.deleteByWorkspaceId(workspaceId);
        workspaceAuditEventRepository.deleteByWorkspaceId(workspaceId);
        workspacePanelPreferencesRepository.deleteByWorkspaceId(workspaceId);
        mentionAuditEventRepository.deleteByWorkspaceId(workspaceId);
        mentionRestrictionRepository.deleteByWorkspaceId(workspaceId);
        workspaceInviteAcceptedDigestRepository.deleteByWorkspaceId(workspaceId);
        workspaceJoinRequestEmailThrottleRepository.deleteByWorkspaceId(workspaceId);
        workspaceRepository.deleteById(workspaceId);
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

    private void setMemberPrimaryRole(WorkspaceMember member, WorkspaceRole role, String fallbackRoleName) {
        if (member == null) {
            return;
        }
        String effectiveRoleName = fallbackRoleName != null ? fallbackRoleName.trim() : "Member";
        String roleId = null;
        if (role != null) {
            roleId = role.getId();
            if (role.getName() != null && !role.getName().isBlank()) {
                effectiveRoleName = role.getName().trim();
            }
        }
        List<String> orderedRoleIds = member.getRoleIds() != null
            ? member.getRoleIds().stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .toList()
            : List.of();
        List<String> mutableRoleIds = new ArrayList<>(orderedRoleIds);
        if (roleId != null && !roleId.isBlank()) {
            final String selectedRoleId = roleId;
            mutableRoleIds.removeIf(existing -> existing.equals(selectedRoleId));
            mutableRoleIds.add(0, selectedRoleId);
            member.setRoleId(selectedRoleId);
        } else if (!mutableRoleIds.isEmpty()) {
            member.setRoleId(mutableRoleIds.get(0));
        } else {
            member.setRoleId(null);
        }
        member.setRoleIds(mutableRoleIds);
        member.setDisplayRoleName(effectiveRoleName);
        member.setRole(mapRoleEnum(effectiveRoleName));
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

    private String normalizeInviteQuestion(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > MAX_INVITE_QUESTION_LENGTH) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invite question must be at most " + MAX_INVITE_QUESTION_LENGTH + " characters"
            );
        }
        return normalized;
    }

    private String normalizeInviteAnswer(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        if (normalized.length() > MAX_INVITE_ANSWER_LENGTH) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invite answer must be at most " + MAX_INVITE_ANSWER_LENGTH + " characters"
            );
        }
        return normalized;
    }

    private void validateInviteAnswer(WorkspaceInvite invite, String inviteAnswer) {
        String inviteQuestion = normalizeInviteQuestion(invite != null ? invite.getJoinQuestion() : null);
        if (inviteQuestion != null && (inviteAnswer == null || inviteAnswer.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite answer is required");
        }
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

    private User safeFindUserById(String userId) {
        if (userId == null || userId.isBlank()) {
            return null;
        }
        try {
            return userService.findById(userId);
        } catch (ResponseStatusException ex) {
            return null;
        }
    }

    private WorkspaceJoinRequest createJoinRequest(String workspaceId, User user, Instant now,
                                                   WorkspaceInvite invite, String inviteAnswer) {
        String inviteQuestion = invite != null ? normalizeInviteQuestion(invite.getJoinQuestion()) : null;
        WorkspaceJoinRequest existingPending = workspaceJoinRequestRepository
            .findByWorkspaceIdAndUserIdAndStatus(workspaceId, user.getId(), WorkspaceJoinRequestStatus.PENDING)
            .stream()
            .findFirst()
            .orElse(null);
        if (existingPending != null) {
            existingPending.setInviteId(invite != null ? invite.getId() : existingPending.getInviteId());
            existingPending.setInvitedByUserId(
                invite != null ? invite.getCreatedByUserId() : existingPending.getInvitedByUserId()
            );
            existingPending.setInviteQuestion(inviteQuestion);
            existingPending.setInviteAnswer(inviteAnswer);
            workspaceJoinRequestRepository.save(existingPending);
            return existingPending;
        }
        WorkspaceJoinRequest request = new WorkspaceJoinRequest();
        request.setWorkspaceId(workspaceId);
        request.setUserId(user.getId());
        request.setInviteId(invite != null ? invite.getId() : null);
        request.setInvitedByUserId(invite != null ? invite.getCreatedByUserId() : null);
        request.setInviteQuestion(inviteQuestion);
        request.setInviteAnswer(inviteAnswer);
        request.setStatus(WorkspaceJoinRequestStatus.PENDING);
        request.setCreatedAt(now);
        return workspaceJoinRequestRepository.save(request);
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

    private String generateUniqueInviteCode() {
        for (int i = 0; i < 20; i++) {
            String code = generateInviteCode();
            if (workspaceInviteRepository.findByCode(code).isEmpty()) {
                return code;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to generate unique invite code");
    }

    private String generateUniqueDemoWorkspaceName() {
        for (int i = 0; i < 80; i++) {
            int number = ThreadLocalRandom.current().nextInt(1, DEMO_NUMBER_MAX + 1);
            String candidate = String.format("%s %04d", DEMO_WORKSPACE_NAME_PREFIX, number);
            if (!workspaceRepository.existsByNameIgnoreCase(candidate)) {
                return candidate;
            }
        }
        return DEMO_WORKSPACE_NAME_PREFIX + " " + Long.toString(Math.abs(ThreadLocalRandom.current().nextLong()), 36).toUpperCase(Locale.ROOT);
    }

    private void clearDuplicatePendingRequests(String workspaceId, String userId, String keepRequestId, String decidedByUserId) {
        Instant now = Instant.now();
        List<WorkspaceJoinRequest> duplicates = workspaceJoinRequestRepository
            .findByWorkspaceIdAndUserIdAndStatus(workspaceId, userId, WorkspaceJoinRequestStatus.PENDING)
            .stream()
            .filter(candidate -> !Objects.equals(candidate.getId(), keepRequestId))
            .toList();
        if (duplicates.isEmpty()) {
            return;
        }
        for (WorkspaceJoinRequest duplicate : duplicates) {
            duplicate.setStatus(WorkspaceJoinRequestStatus.CANCELED);
            duplicate.setDecidedAt(now);
            duplicate.setDecidedByUserId(decidedByUserId);
        }
        workspaceJoinRequestRepository.saveAll(duplicates);
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
