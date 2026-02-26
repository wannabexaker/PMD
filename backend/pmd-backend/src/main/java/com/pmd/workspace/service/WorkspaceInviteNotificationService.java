package com.pmd.workspace.service;

import com.pmd.notification.EmailNotificationService;
import com.pmd.notification.model.WorkspaceInviteAcceptedDigestEntry;
import com.pmd.notification.model.WorkspaceJoinRequestEmailThrottle;
import com.pmd.notification.repository.WorkspaceInviteAcceptedDigestRepository;
import com.pmd.notification.repository.WorkspaceJoinRequestEmailThrottleRepository;
import com.pmd.notification.service.NotificationPreferencesService;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceInviteNotificationService {

    private static final String THROTTLE_EVENT_JOIN_REQUEST_SUBMITTED = "JOIN_REQUEST_SUBMITTED";
    private static final long JOIN_REQUEST_BATCH_WINDOW_MINUTES = 10;

    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceRoleRepository workspaceRoleRepository;
    private final UserRepository userRepository;
    private final WorkspaceJoinRequestEmailThrottleRepository throttleRepository;
    private final WorkspaceInviteAcceptedDigestRepository digestRepository;
    private final EmailNotificationService emailNotificationService;
    private final NotificationPreferencesService notificationPreferencesService;

    public WorkspaceInviteNotificationService(
        WorkspaceMemberRepository workspaceMemberRepository,
        WorkspaceRoleRepository workspaceRoleRepository,
        UserRepository userRepository,
        WorkspaceJoinRequestEmailThrottleRepository throttleRepository,
        WorkspaceInviteAcceptedDigestRepository digestRepository,
        EmailNotificationService emailNotificationService,
        NotificationPreferencesService notificationPreferencesService
    ) {
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceRoleRepository = workspaceRoleRepository;
        this.userRepository = userRepository;
        this.throttleRepository = throttleRepository;
        this.digestRepository = digestRepository;
        this.emailNotificationService = emailNotificationService;
        this.notificationPreferencesService = notificationPreferencesService;
    }

    public void notifyInviteCreated(Workspace workspace, WorkspaceInvite invite, User inviter) {
        if (workspace == null || invite == null) {
            return;
        }
        String invitedEmail = invite.getInvitedEmail();
        if (invitedEmail == null || invitedEmail.isBlank()) {
            return;
        }
        User recipient = userRepository.findByEmailIgnoreCase(invitedEmail).orElse(null);
        if (recipient != null) {
            emailNotificationService.sendWorkspaceInviteCreated(recipient, workspace, invite, inviter);
            return;
        }
        emailNotificationService.sendWorkspaceInviteCreatedExternal(invitedEmail, workspace, invite, inviter);
    }

    public void notifyJoinRequestSubmitted(Workspace workspace, WorkspaceJoinRequest request, User requester) {
        if (workspace == null || request == null || requester == null) {
            return;
        }
        List<User> approvers = resolveApprovers(workspace.getId());
        Instant now = Instant.now();
        for (User approver : approvers) {
            if (approver == null || approver.getId() == null) {
                continue;
            }
            if (Objects.equals(approver.getId(), requester.getId())) {
                continue;
            }
            if (!acquireJoinRequestBatchSlot(workspace.getId(), approver.getId(), now)) {
                continue;
            }
            emailNotificationService.sendWorkspaceJoinRequestSubmitted(approver, workspace, requester);
        }
    }

    public void notifyJoinRequestDecision(Workspace workspace, WorkspaceJoinRequest request, User requesterUser, User decidedBy) {
        if (workspace == null || request == null || requesterUser == null) {
            return;
        }
        boolean approved = request.getStatus() == com.pmd.workspace.model.WorkspaceJoinRequestStatus.APPROVED;
        emailNotificationService.sendWorkspaceJoinRequestDecision(requesterUser, workspace, approved, decidedBy);
    }

    public void notifyMemberJoined(Workspace workspace, WorkspaceMember joiner, User joinedUser, User inviter) {
        if (workspace == null || joiner == null || joinedUser == null) {
            return;
        }
        Set<String> recipientIds = new LinkedHashSet<>();
        if (inviter != null && inviter.getId() != null && !Objects.equals(inviter.getId(), joinedUser.getId())) {
            recipientIds.add(inviter.getId());
        } else {
            resolveOwnerManagerRecipientIds(workspace.getId(), joinedUser.getId()).forEach(recipientIds::add);
        }
        if (recipientIds.isEmpty()) {
            return;
        }
        Map<String, User> userById = userRepository.findAllById(recipientIds).stream()
            .filter(Objects::nonNull)
            .filter(user -> user.getId() != null)
            .collect(Collectors.toMap(User::getId, user -> user));
        Instant now = Instant.now();
        for (String recipientId : recipientIds) {
            User recipient = userById.get(recipientId);
            if (recipient == null) {
                continue;
            }
            var prefs = notificationPreferencesService.resolvePreferences(recipientId);
            if (prefs.isEmailOnWorkspaceInviteAccepted()) {
                emailNotificationService.sendWorkspaceInviteAccepted(recipient, workspace, joinedUser);
            } else if (prefs.isEmailOnWorkspaceInviteAcceptedDigest()) {
                enqueueInviteAcceptedDigest(recipientId, workspace, joinedUser, now);
            }
        }
    }

    @Scheduled(cron = "0 10 9 * * *")
    public void sendInviteAcceptedDigest() {
        Instant now = Instant.now();
        List<WorkspaceInviteAcceptedDigestEntry> pending = digestRepository.findByDeliveredAtIsNullAndCreatedAtBefore(now);
        if (pending.isEmpty()) {
            return;
        }
        Map<String, List<WorkspaceInviteAcceptedDigestEntry>> byRecipient = pending.stream()
            .collect(Collectors.groupingBy(WorkspaceInviteAcceptedDigestEntry::getRecipientUserId));
        List<WorkspaceInviteAcceptedDigestEntry> delivered = new ArrayList<>();
        for (Map.Entry<String, List<WorkspaceInviteAcceptedDigestEntry>> entry : byRecipient.entrySet()) {
            String recipientId = entry.getKey();
            if (recipientId == null || recipientId.isBlank()) {
                continue;
            }
            User recipient = userRepository.findById(recipientId).orElse(null);
            if (recipient == null) {
                continue;
            }
            List<WorkspaceInviteAcceptedDigestEntry> recipientEntries = entry.getValue().stream()
                .sorted(Comparator.comparing(WorkspaceInviteAcceptedDigestEntry::getJoinedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
            Map<String, List<WorkspaceInviteAcceptedDigestEntry>> byWorkspace = recipientEntries.stream()
                .collect(Collectors.groupingBy(item -> safe(item.getWorkspaceId()), LinkedHashMap::new, Collectors.toList()));
            for (List<WorkspaceInviteAcceptedDigestEntry> workspaceEntries : byWorkspace.values()) {
                String workspaceName = workspaceEntries.stream()
                    .map(WorkspaceInviteAcceptedDigestEntry::getWorkspaceName)
                    .filter(name -> name != null && !name.isBlank())
                    .findFirst()
                    .orElse("Workspace");
                List<String> lines = workspaceEntries.stream()
                    .map(item -> safe(item.getJoinedUserName()))
                    .filter(name -> !name.isBlank())
                    .distinct()
                    .toList();
                if (!lines.isEmpty()) {
                    emailNotificationService.sendWorkspaceInviteAcceptedDigest(recipient, workspaceName, lines);
                }
                workspaceEntries.forEach(item -> item.setDeliveredAt(now));
                delivered.addAll(workspaceEntries);
            }
        }
        if (!delivered.isEmpty()) {
            digestRepository.saveAll(delivered);
        }
    }

    private boolean acquireJoinRequestBatchSlot(String workspaceId, String recipientUserId, Instant now) {
        String id = workspaceId + ":" + recipientUserId + ":" + THROTTLE_EVENT_JOIN_REQUEST_SUBMITTED;
        WorkspaceJoinRequestEmailThrottle throttle = throttleRepository.findById(id).orElse(null);
        Instant threshold = now.minus(JOIN_REQUEST_BATCH_WINDOW_MINUTES, ChronoUnit.MINUTES);
        if (throttle != null && throttle.getLastSentAt() != null && throttle.getLastSentAt().isAfter(threshold)) {
            return false;
        }
        if (throttle == null) {
            throttle = new WorkspaceJoinRequestEmailThrottle();
            throttle.setId(id);
            throttle.setWorkspaceId(workspaceId);
            throttle.setRecipientUserId(recipientUserId);
            throttle.setEventType(THROTTLE_EVENT_JOIN_REQUEST_SUBMITTED);
        }
        throttle.setLastSentAt(now);
        throttleRepository.save(throttle);
        return true;
    }

    private List<User> resolveApprovers(String workspaceId) {
        List<WorkspaceMember> activeMembers = workspaceMemberRepository.findByWorkspaceId(workspaceId).stream()
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .filter(member -> member.getUserId() != null)
            .toList();
        if (activeMembers.isEmpty()) {
            return List.of();
        }
        Map<String, WorkspaceRole> rolesById = workspaceRoleRepository.findByWorkspaceId(workspaceId).stream()
            .filter(role -> role.getId() != null)
            .collect(Collectors.toMap(WorkspaceRole::getId, role -> role));
        Set<String> approverIds = activeMembers.stream()
            .filter(member -> allowsApproveJoinRequests(member, rolesById))
            .map(WorkspaceMember::getUserId)
            .collect(Collectors.toCollection(LinkedHashSet::new));
        if (approverIds.isEmpty()) {
            return List.of();
        }
        return userRepository.findAllById(approverIds).stream()
            .filter(Objects::nonNull)
            .toList();
    }

    private List<String> resolveOwnerManagerRecipientIds(String workspaceId, String joinedUserId) {
        List<WorkspaceMember> activeMembers = workspaceMemberRepository.findByWorkspaceId(workspaceId).stream()
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .filter(member -> member.getUserId() != null)
            .toList();
        if (activeMembers.isEmpty()) {
            return List.of();
        }
        Map<String, WorkspaceRole> rolesById = workspaceRoleRepository.findByWorkspaceId(workspaceId).stream()
            .filter(role -> role.getId() != null)
            .collect(Collectors.toMap(WorkspaceRole::getId, role -> role));
        return activeMembers.stream()
            .filter(member -> !Objects.equals(member.getUserId(), joinedUserId))
            .filter(member -> isOwnerOrManager(member, rolesById))
            .map(WorkspaceMember::getUserId)
            .distinct()
            .toList();
    }

    private boolean allowsApproveJoinRequests(WorkspaceMember member, Map<String, WorkspaceRole> rolesById) {
        WorkspaceRolePermissions permissions = resolvePermissions(member, rolesById);
        return permissions != null && permissions.allows(WorkspacePermission.APPROVE_JOIN_REQUESTS);
    }

    private boolean isOwnerOrManager(WorkspaceMember member, Map<String, WorkspaceRole> rolesById) {
        WorkspaceRolePermissions permissions = resolvePermissions(member, rolesById);
        if (permissions != null && permissions.allows(WorkspacePermission.MANAGE_WORKSPACE_SETTINGS)) {
            return true;
        }
        WorkspaceMemberRole legacyRole = member.getRole();
        return legacyRole == WorkspaceMemberRole.OWNER || legacyRole == WorkspaceMemberRole.ADMIN;
    }

    private WorkspaceRolePermissions resolvePermissions(WorkspaceMember member, Map<String, WorkspaceRole> rolesById) {
        if (member.getRoleId() != null) {
            WorkspaceRole role = rolesById.get(member.getRoleId());
            if (role != null) {
                return role.getPermissions();
            }
        }
        if (member.getRole() == null) {
            return null;
        }
        return switch (member.getRole()) {
            case OWNER -> WorkspaceRolePermissions.ownerDefaults();
            case ADMIN -> WorkspaceRolePermissions.managerDefaults();
            case MEMBER -> WorkspaceRolePermissions.memberDefaults();
        };
    }

    private void enqueueInviteAcceptedDigest(String recipientUserId, Workspace workspace, User joinedUser, Instant now) {
        WorkspaceInviteAcceptedDigestEntry entry = new WorkspaceInviteAcceptedDigestEntry();
        entry.setRecipientUserId(recipientUserId);
        entry.setWorkspaceId(workspace.getId());
        entry.setWorkspaceName(workspace.getName());
        entry.setJoinedUserId(joinedUser.getId());
        entry.setJoinedUserName(joinedUser.getDisplayName());
        entry.setJoinedAt(now);
        entry.setCreatedAt(now);
        digestRepository.save(entry);
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
