package com.pmd.audit.service;

import com.pmd.audit.dto.WorkspaceAuditEventResponse;
import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.user.model.User;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.service.WorkspaceService;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceAuditService {

    private static final int DEFAULT_LIMIT = 120;
    private static final int MAX_LIMIT = 500;

    private final WorkspaceService workspaceService;
    private final MongoTemplate mongoTemplate;
    private final WorkspaceAuditWriter writer;

    public WorkspaceAuditService(WorkspaceService workspaceService,
                                 MongoTemplate mongoTemplate,
                                 WorkspaceAuditWriter writer) {
        this.workspaceService = workspaceService;
        this.mongoTemplate = mongoTemplate;
        this.writer = writer;
    }

    public void log(WorkspaceAuditWriteRequest request) {
        writer.log(request);
    }

    public List<WorkspaceAuditEventResponse> list(String workspaceId, WorkspaceAuditQuery query, User requester) {
        workspaceService.requireActiveMembership(workspaceId, requester);
        boolean actorIsRequester = !isBlank(query.actorUserId()) && query.actorUserId().equals(requester.getId());
        boolean asksOtherActor = !isBlank(query.actorUserId()) && !actorIsRequester;
        boolean personalScope = query.isPersonalOnly() || actorIsRequester;
        if (!personalScope || asksOtherActor) {
            workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.VIEW_STATS);
        }

        Query mongoQuery = new Query();
        List<Criteria> criteria = new ArrayList<>();
        criteria.add(Criteria.where("workspaceId").is(workspaceId));

        if (query.isPersonalOnly()) {
            criteria.add(Criteria.where("actorUserId").is(requester.getId()));
        }
        if (!isBlank(query.actorUserId())) {
            criteria.add(Criteria.where("actorUserId").is(query.actorUserId()));
        }
        if (!isBlank(query.targetUserId())) {
            criteria.add(Criteria.where("targetUserId").is(query.targetUserId()));
        }
        if (!isBlank(query.teamId())) {
            criteria.add(Criteria.where("teamId").is(query.teamId()));
        }
        if (!isBlank(query.roleId())) {
            criteria.add(Criteria.where("roleId").is(query.roleId()));
        }
        if (!isBlank(query.projectId())) {
            criteria.add(Criteria.where("projectId").is(query.projectId()));
        }
        if (!isBlank(query.category())) {
            criteria.add(Criteria.where("category").is(query.category().trim().toUpperCase()));
        }
        if (!isBlank(query.action())) {
            criteria.add(Criteria.where("action").is(query.action().trim().toUpperCase()));
        }
        if (!isBlank(query.from())) {
            Instant from = parseInstantSafe(query.from());
            if (from != null) {
                criteria.add(Criteria.where("createdAt").gte(from));
            }
        }
        if (!isBlank(query.to())) {
            Instant to = parseInstantSafe(query.to());
            if (to != null) {
                criteria.add(Criteria.where("createdAt").lte(to));
            }
        }
        if (!isBlank(query.q())) {
            String regex = ".*" + java.util.regex.Pattern.quote(query.q().trim()) + ".*";
            criteria.add(new Criteria().orOperator(
                Criteria.where("message").regex(regex, "i"),
                Criteria.where("entityName").regex(regex, "i"),
                Criteria.where("actorName").regex(regex, "i"),
                Criteria.where("action").regex(regex, "i"),
                Criteria.where("category").regex(regex, "i")
            ));
        }

        mongoQuery.addCriteria(new Criteria().andOperator(criteria.toArray(Criteria[]::new)));
        mongoQuery.with(Sort.by(Sort.Direction.DESC, "createdAt"));
        mongoQuery.limit(clampLimit(query.limit()));

        return mongoTemplate.find(mongoQuery, WorkspaceAuditEvent.class).stream()
            .map(this::toResponse)
            .toList();
    }

    private WorkspaceAuditEventResponse toResponse(WorkspaceAuditEvent event) {
        return new WorkspaceAuditEventResponse(
            event.getId(),
            event.getWorkspaceId(),
            event.getCreatedAt(),
            event.getCategory(),
            event.getAction(),
            event.getOutcome(),
            event.getActorUserId(),
            event.getActorName(),
            event.getTargetUserId(),
            event.getTeamId(),
            event.getRoleId(),
            event.getProjectId(),
            event.getEntityType(),
            event.getEntityId(),
            event.getEntityName(),
            event.getMessage()
        );
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private Instant parseInstantSafe(String value) {
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private int clampLimit(Integer raw) {
        if (raw == null) {
            return DEFAULT_LIMIT;
        }
        return Math.max(1, Math.min(MAX_LIMIT, raw));
    }

    public record WorkspaceAuditWriteRequest(
        String workspaceId,
        String category,
        String action,
        String outcome,
        User actor,
        String targetUserId,
        String teamId,
        String roleId,
        String projectId,
        String entityType,
        String entityId,
        String entityName,
        String message
    ) {
    }

    public record WorkspaceAuditQuery(
        Boolean personalOnly,
        String actorUserId,
        String targetUserId,
        String teamId,
        String roleId,
        String projectId,
        String category,
        String action,
        String from,
        String to,
        String q,
        Integer limit
    ) {
        public boolean isPersonalOnly() {
            return Boolean.TRUE.equals(personalOnly);
        }
    }
}
