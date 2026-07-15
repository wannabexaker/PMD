package com.pmd.privacy.service;

import com.pmd.upload.service.AvatarCleanupService;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import com.pmd.workspace.service.WorkspaceService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * Implements the two data-subject rights that need code rather than prose: export (GDPR
 * Art. 20) and erasure (Art. 17).
 *
 * <p>Erasure is an anonymisation, not a cascade delete: everything that identifies the
 * person is removed, while content they authored inside other people's workspaces stays
 * put and simply stops resolving to a name. Deleting that content would destroy other
 * users' records, which erasure does not entitle anyone to do.
 */
@Service
public class AccountPrivacyService {

    private static final Logger logger = LoggerFactory.getLogger(AccountPrivacyService.class);

    /** Shown in place of a deleted author on retained audit rows. */
    private static final String ANONYMISED_NAME = "Deleted user";

    private final MongoTemplate mongo;
    private final UserRepository userRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceService workspaceService;
    private final AvatarCleanupService avatarCleanupService;

    public AccountPrivacyService(MongoTemplate mongo,
                                 UserRepository userRepository,
                                 WorkspaceMemberRepository workspaceMemberRepository,
                                 WorkspaceRepository workspaceRepository,
                                 WorkspaceService workspaceService,
                                 AvatarCleanupService avatarCleanupService) {
        this.mongo = mongo;
        this.userRepository = userRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceRepository = workspaceRepository;
        this.workspaceService = workspaceService;
        this.avatarCleanupService = avatarCleanupService;
    }

    /**
     * Workspaces this user administers where nobody else could take over. Deleting the
     * account would strand the other members, so we ask them to hand over or close the
     * workspace first instead of silently orphaning it.
     */
    public List<String> findWorkspacesBlockingDeletion(User user) {
        List<String> blocking = new ArrayList<>();
        for (WorkspaceMember membership : workspaceMemberRepository.findByUserId(user.getId())) {
            if (membership.getStatus() != WorkspaceMemberStatus.ACTIVE) {
                continue;
            }
            String workspaceId = membership.getWorkspaceId();
            if (!canManage(workspaceId, membership)) {
                continue;
            }
            List<WorkspaceMember> others = workspaceMemberRepository
                .findByWorkspaceIdAndStatus(workspaceId, WorkspaceMemberStatus.ACTIVE)
                .stream()
                .filter(m -> !user.getId().equals(m.getUserId()))
                .toList();
            if (others.isEmpty()) {
                continue; // solo workspace: nobody is left behind
            }
            boolean someoneElseCanManage = others.stream().anyMatch(m -> canManage(workspaceId, m));
            if (!someoneElseCanManage) {
                String name = workspaceRepository.findById(workspaceId)
                    .map(w -> w.getName() == null || w.getName().isBlank() ? workspaceId : w.getName())
                    .orElse(workspaceId);
                blocking.add(name);
            }
        }
        return blocking;
    }

    private boolean canManage(String workspaceId, WorkspaceMember member) {
        WorkspaceRolePermissions permissions = workspaceService.resolveMemberPermissions(workspaceId, member);
        return permissions != null && permissions.allows(WorkspacePermission.MANAGE_WORKSPACE_SETTINGS);
    }

    /** Everything we hold about this user, in the shape we actually store it. */
    public Map<String, Object> exportUserData(User user) {
        Map<String, Object> export = new LinkedHashMap<>();
        export.put("exportedAt", Instant.now().toString());
        export.put("notice", "Personal data held by PMD about this account. "
            + "IP addresses and user agents are stored only in anonymised form.");

        Map<String, Object> profile = new LinkedHashMap<>();
        profile.put("id", user.getId());
        profile.put("email", user.getEmail());
        profile.put("username", user.getUsername());
        profile.put("displayName", user.getDisplayName());
        profile.put("firstName", user.getFirstName());
        profile.put("lastName", user.getLastName());
        profile.put("bio", user.getBio());
        profile.put("avatarUrl", user.getAvatarUrl());
        profile.put("emailVerified", user.isEmailVerified());
        profile.put("signedInWithGoogle", user.getGoogleId() != null && !user.getGoogleId().isBlank());
        profile.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt().toString() : null);
        // The acceptance record is held about the user, so it belongs in their copy — and it is
        // the one piece here they might actually want to check. Null on accounts created before
        // it was recorded, which means unrecorded, not refused.
        profile.put("termsAcceptedAt", user.getTermsAcceptedAt() != null ? user.getTermsAcceptedAt().toString() : null);
        profile.put("termsVersion", user.getTermsVersion());
        // Deliberately omitted: passwordHash and googleId — secrets/identifiers that would
        // only create risk in an exported file without telling the user anything useful.
        export.put("profile", profile);

        export.put("workspaceMemberships", raw("workspace_members", Criteria.where("userId").is(user.getId())));
        export.put("sessions", raw("auth_sessions", Criteria.where("userId").is(user.getId())));
        export.put("securityEvents", raw("auth_security_events", new Criteria().orOperator(
            Criteria.where("userId").is(user.getId()),
            Criteria.where("username").is(user.getUsername())
        )));
        export.put("notificationPreferences", raw("user_notification_preferences", Criteria.where("userId").is(user.getId())));
        export.put("panelPreferences", raw("workspace_panel_preferences", Criteria.where("userId").is(user.getId())));
        export.put("joinRequests", raw("workspace_join_requests", Criteria.where("userId").is(user.getId())));
        export.put("commentsAuthored", raw("project_comments", Criteria.where("authorUserId").is(user.getId())));
        export.put("projectsMemberOf", raw("projects", Criteria.where("memberIds").is(user.getId())));
        export.put("auditTrail", raw("workspace_audit_events", new Criteria().orOperator(
            Criteria.where("actorUserId").is(user.getId()),
            Criteria.where("targetUserId").is(user.getId())
        )));
        return export;
    }

    private List<Map> raw(String collection, Criteria criteria) {
        return mongo.find(Query.query(criteria), Map.class, collection);
    }

    /**
     * Erases the account. Identifying records are deleted outright; references held inside
     * other people's data are stripped of the name but keep their opaque id, which no longer
     * resolves to anyone once the user document is gone.
     */
    public void deleteAccount(User user) {
        String userId = user.getId();
        String username = user.getUsername();
        String email = user.getEmail();

        // Records that exist only to describe this person.
        removeAll("auth_sessions", Criteria.where("userId").is(userId));
        removeAll("email_verification_tokens", Criteria.where("userId").is(userId));
        removeAll("user_notification_preferences", Criteria.where("userId").is(userId));
        removeAll("mention_restrictions", Criteria.where("userId").is(userId));
        removeAll("workspace_panel_preferences", Criteria.where("userId").is(userId));
        removeAll("workspace_members", Criteria.where("userId").is(userId));
        removeAll("workspace_join_requests", Criteria.where("userId").is(userId));
        // Security events are keyed by the email that was typed, so failed attempts for an
        // unknown user are matched by username rather than id.
        removeAll("auth_security_events", new Criteria().orOperator(
            Criteria.where("userId").is(userId),
            Criteria.where("username").is(username)
        ));
        if (email != null && !email.isBlank()) {
            removeAll("people", Criteria.where("email").is(email));
        }

        // References inside records that belong to other people: drop the person, keep the row.
        unset("workspaces", Criteria.where("createdByUserId").is(userId), "createdByUserId");
        unset("workspace_invites", Criteria.where("createdByUserId").is(userId), "createdByUserId");
        unset("workspace_members", Criteria.where("invitedByUserId").is(userId), "invitedByUserId");
        unset("workspace_join_requests", Criteria.where("invitedByUserId").is(userId), "invitedByUserId");
        unset("projects", Criteria.where("createdByUserId").is(userId), "createdByUserId");
        pull("projects", Criteria.where("memberIds").is(userId), "memberIds", userId);
        // The audit trail is retained for security, but the actor's name is personal data.
        set("workspace_audit_events", Criteria.where("actorUserId").is(userId), "actorName", ANONYMISED_NAME);

        userRepository.deleteById(userId);
        // The photo is personal data and /uploads is public, so leaving the file behind would
        // keep a face downloadable forever by anyone who ever saw the URL. Done after the
        // document is gone: an orphaned file is a smaller problem than a record pointing at nothing.
        avatarCleanupService.deleteIfUnreferenced(user.getAvatarUrl(), "account erasure");
        logger.info("Erased account {} on request", userId);
    }

    private void removeAll(String collection, Criteria criteria) {
        mongo.remove(Query.query(criteria), collection);
    }

    private void unset(String collection, Criteria criteria, String field) {
        mongo.updateMulti(Query.query(criteria), new Update().unset(field), collection);
    }

    private void set(String collection, Criteria criteria, String field, Object value) {
        mongo.updateMulti(Query.query(criteria), new Update().set(field, value), collection);
    }

    private void pull(String collection, Criteria criteria, String field, Object value) {
        mongo.updateMulti(Query.query(criteria), new Update().pull(field, value), collection);
    }
}
