package com.pmd.admin.controller;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import com.pmd.auth.policy.AccessPolicy;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.repository.TeamRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import com.pmd.workspace.repository.WorkspaceInviteRepository;
import com.pmd.workspace.repository.WorkspaceJoinRequestRepository;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final int DEFAULT_AUDIT_LIMIT = 200;
    private static final int MAX_AUDIT_LIMIT = 1000;

    private final UserRepository userRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final WorkspaceRoleRepository workspaceRoleRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final WorkspaceJoinRequestRepository workspaceJoinRequestRepository;
    private final WorkspaceAuditEventRepository workspaceAuditEventRepository;
    private final AccessPolicy accessPolicy;
    private final MongoTemplate mongoTemplate;

    public AdminController(UserRepository userRepository,
                           WorkspaceRepository workspaceRepository,
                           ProjectRepository projectRepository,
                           TeamRepository teamRepository,
                           WorkspaceRoleRepository workspaceRoleRepository,
                           WorkspaceMemberRepository workspaceMemberRepository,
                           WorkspaceInviteRepository workspaceInviteRepository,
                           WorkspaceJoinRequestRepository workspaceJoinRequestRepository,
                           WorkspaceAuditEventRepository workspaceAuditEventRepository,
                           AccessPolicy accessPolicy,
                           MongoTemplate mongoTemplate) {
        this.userRepository = userRepository;
        this.workspaceRepository = workspaceRepository;
        this.projectRepository = projectRepository;
        this.teamRepository = teamRepository;
        this.workspaceRoleRepository = workspaceRoleRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceInviteRepository = workspaceInviteRepository;
        this.workspaceJoinRequestRepository = workspaceJoinRequestRepository;
        this.workspaceAuditEventRepository = workspaceAuditEventRepository;
        this.accessPolicy = accessPolicy;
        this.mongoTemplate = mongoTemplate;
    }

    @GetMapping("/overview")
    public AdminOverviewResponse overview(Authentication authentication) {
        requireAdmin(authentication);
        long users = userRepository.count();
        long workspaces = workspaceRepository.count();
        long projects = projectRepository.count();
        long teams = teamRepository.count();
        long roles = workspaceRoleRepository.count();
        long members = workspaceMemberRepository.count();
        long invites = workspaceInviteRepository.count();
        long pendingRequests = workspaceJoinRequestRepository.count();
        long audits = workspaceAuditEventRepository.count();

        return new AdminOverviewResponse(
            users,
            workspaces,
            projects,
            teams,
            roles,
            members,
            invites,
            pendingRequests,
            audits,
            countMissingWorkspaceId("projects"),
            countMissingWorkspaceId("teams"),
            countMissingWorkspaceId("workspace_roles"),
            countMissingWorkspaceId("workspace_members"),
            countMissingWorkspaceId("workspace_invites"),
            countMissingWorkspaceId("workspace_join_requests"),
            countMissingWorkspaceId("workspace_audit_events")
        );
    }

    @GetMapping("/workspaces")
    public List<AdminWorkspaceRow> workspaces(Authentication authentication) {
        requireAdmin(authentication);
        return workspaceRepository.findAll(Sort.by(Sort.Direction.ASC, "name")).stream()
            .map(this::toWorkspaceRow)
            .toList();
    }

    @GetMapping("/users")
    public List<AdminUserRow> users(Authentication authentication, @RequestParam(name = "q", required = false) String q) {
        requireAdmin(authentication);
        String term = q == null ? "" : q.trim().toLowerCase();
        return userRepository.findAll(Sort.by(Sort.Direction.ASC, "displayName")).stream()
            .filter(user -> term.isBlank()
                || contains(user.getDisplayName(), term)
                || contains(user.getEmail(), term)
                || contains(user.getFirstName(), term)
                || contains(user.getLastName(), term))
            .map(user -> new AdminUserRow(
                user.getId(),
                user.getDisplayName(),
                user.getEmail(),
                user.isAdmin(),
                user.isEmailVerified(),
                user.getCreatedAt()
            ))
            .toList();
    }

    @GetMapping("/audit")
    public List<AdminAuditRow> audit(Authentication authentication,
                                     @RequestParam(name = "workspaceId", required = false) String workspaceId,
                                     @RequestParam(name = "actorUserId", required = false) String actorUserId,
                                     @RequestParam(name = "category", required = false) String category,
                                     @RequestParam(name = "action", required = false) String action,
                                     @RequestParam(name = "q", required = false) String q,
                                     @RequestParam(name = "limit", required = false) Integer limit) {
        requireAdmin(authentication);
        Query query = new Query();
        if (!isBlank(workspaceId)) {
            query.addCriteria(Criteria.where("workspaceId").is(workspaceId.trim()));
        }
        if (!isBlank(actorUserId)) {
            query.addCriteria(Criteria.where("actorUserId").is(actorUserId.trim()));
        }
        if (!isBlank(category)) {
            query.addCriteria(Criteria.where("category").is(category.trim().toUpperCase()));
        }
        if (!isBlank(action)) {
            query.addCriteria(Criteria.where("action").is(action.trim().toUpperCase()));
        }
        if (!isBlank(q)) {
            String regex = ".*" + java.util.regex.Pattern.quote(q.trim()) + ".*";
            query.addCriteria(new Criteria().orOperator(
                Criteria.where("message").regex(regex, "i"),
                Criteria.where("entityName").regex(regex, "i"),
                Criteria.where("actorName").regex(regex, "i")
            ));
        }
        query.with(Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "_id")));
        query.limit(clampLimit(limit));
        return mongoTemplate.find(query, WorkspaceAuditEvent.class).stream()
            .map(event -> new AdminAuditRow(
                event.getId(),
                event.getWorkspaceId(),
                event.getCreatedAt(),
                event.getCategory(),
                event.getAction(),
                event.getOutcome(),
                event.getActorUserId(),
                event.getActorName(),
                event.getEntityType(),
                event.getEntityId(),
                event.getEntityName(),
                event.getMessage()
            ))
            .toList();
    }

    private AdminWorkspaceRow toWorkspaceRow(Workspace workspace) {
        String workspaceId = workspace.getId();
        long memberCount = workspaceMemberRepository.countByWorkspaceId(workspaceId);
        long teamCount = teamRepository.countByWorkspaceId(workspaceId);
        long roleCount = workspaceRoleRepository.countByWorkspaceId(workspaceId);
        long projectCount = projectRepository.countByWorkspaceId(workspaceId);
        long inviteCount = workspaceInviteRepository.countByWorkspaceId(workspaceId);
        long pendingRequestCount = workspaceJoinRequestRepository.countByWorkspaceIdAndStatus(workspaceId, WorkspaceJoinRequestStatus.PENDING);
        WorkspaceAuditEvent lastAudit = workspaceAuditEventRepository.findTopByWorkspaceIdOrderByCreatedAtDescIdDesc(workspaceId);
        return new AdminWorkspaceRow(
            workspace.getId(),
            workspace.getName(),
            workspace.getSlug(),
            workspace.isDemo(),
            workspace.getCreatedByUserId(),
            workspace.getCreatedAt(),
            memberCount,
            teamCount,
            roleCount,
            projectCount,
            inviteCount,
            pendingRequestCount,
            lastAudit != null ? lastAudit.getCreatedAt() : null
        );
    }

    private long countMissingWorkspaceId(String collection) {
        Query query = Query.query(new Criteria().orOperator(
            Criteria.where("workspaceId").exists(false),
            Criteria.where("workspaceId").is(null),
            Criteria.where("workspaceId").is("")
        ));
        return mongoTemplate.count(query, collection);
    }

    private User requireAdmin(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            User requester = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized"));
            if (accessPolicy.isAdmin(requester)) {
                return requester;
            }
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "PMD admin only.");
    }

    private int clampLimit(Integer value) {
        if (value == null) {
            return DEFAULT_AUDIT_LIMIT;
        }
        return Math.max(1, Math.min(MAX_AUDIT_LIMIT, value));
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private boolean contains(String value, String term) {
        return value != null && value.toLowerCase().contains(term);
    }

    public record AdminOverviewResponse(
        long totalUsers,
        long totalWorkspaces,
        long totalProjects,
        long totalTeams,
        long totalRoles,
        long totalWorkspaceMembers,
        long totalInvites,
        long totalJoinRequests,
        long totalAuditEvents,
        long missingWorkspaceIdProjects,
        long missingWorkspaceIdTeams,
        long missingWorkspaceIdRoles,
        long missingWorkspaceIdMembers,
        long missingWorkspaceIdInvites,
        long missingWorkspaceIdJoinRequests,
        long missingWorkspaceIdAuditEvents
    ) {
    }

    public record AdminWorkspaceRow(
        String id,
        String name,
        String slug,
        boolean demo,
        String createdByUserId,
        Instant createdAt,
        long members,
        long teams,
        long roles,
        long projects,
        long invites,
        long pendingJoinRequests,
        Instant lastAuditAt
    ) {
    }

    public record AdminUserRow(
        String id,
        String displayName,
        String email,
        boolean admin,
        boolean emailVerified,
        Instant createdAt
    ) {
    }

    public record AdminAuditRow(
        String id,
        String workspaceId,
        Instant createdAt,
        String category,
        String action,
        String outcome,
        String actorUserId,
        String actorName,
        String entityType,
        String entityId,
        String entityName,
        String message
    ) {
    }
}

