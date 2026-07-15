package com.pmd.audit.service;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import com.pmd.user.model.User;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Locale;
import java.util.Objects;
import java.util.StringJoiner;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Component;

/**
 * Appends to the hash-chained workspace audit log.
 *
 * <p>Split out of {@link WorkspaceAuditService} because writing an event needs nothing from
 * {@code WorkspaceService}, while reading events needs it for the permission check. Keeping
 * them together would force {@code WorkspaceService} — which now records platform-admin
 * access — into a dependency cycle with the audit service.
 *
 * <p>Each event carries the hash of the one before it, so a deleted or edited row breaks the
 * chain from that point on. That is the property that makes the admin-access records worth
 * anything: the operator cannot quietly remove evidence of their own access.
 */
@Component
public class WorkspaceAuditWriter {

    private final WorkspaceAuditEventRepository auditRepository;
    private final MongoTemplate mongoTemplate;

    public WorkspaceAuditWriter(WorkspaceAuditEventRepository auditRepository, MongoTemplate mongoTemplate) {
        this.auditRepository = auditRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public void log(WorkspaceAuditService.WorkspaceAuditWriteRequest request) {
        if (request == null || isBlank(request.workspaceId()) || request.actor() == null) {
            return;
        }
        WorkspaceAuditEvent previous = auditRepository.findTopByWorkspaceIdOrderByCreatedAtDescIdDesc(request.workspaceId());
        String prevHash = previous != null ? blankToNull(previous.getEventHash()) : null;
        WorkspaceAuditEvent event = new WorkspaceAuditEvent();
        event.setWorkspaceId(request.workspaceId());
        event.setCreatedAt(Instant.now());
        event.setCategory(normalize(request.category(), "GENERAL"));
        event.setAction(normalize(request.action(), "UNKNOWN"));
        event.setOutcome(normalize(request.outcome(), "SUCCESS"));
        event.setActorUserId(request.actor().getId());
        event.setActorName(request.actor().getDisplayName());
        event.setTargetUserId(blankToNull(request.targetUserId()));
        event.setTeamId(blankToNull(request.teamId()));
        event.setRoleId(blankToNull(request.roleId()));
        event.setProjectId(blankToNull(request.projectId()));
        event.setEntityType(blankToNull(request.entityType()));
        event.setEntityId(blankToNull(request.entityId()));
        event.setEntityName(blankToNull(request.entityName()));
        event.setMessage(blankToNull(request.message()));
        event.setPrevEventHash(prevHash);
        event.setEventHash(hashEvent(event, prevHash));
        mongoTemplate.insert(event);
    }

    private String normalize(String value, String fallback) {
        if (isBlank(value)) {
            return fallback;
        }
        return value.trim().toUpperCase();
    }

    private String blankToNull(String value) {
        return isBlank(value) ? null : value.trim();
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String hashEvent(WorkspaceAuditEvent event, String prevHash) {
        StringJoiner joiner = new StringJoiner("|");
        joiner.add(nonNull(event.getWorkspaceId()));
        joiner.add(nonNull(event.getCreatedAt() != null ? event.getCreatedAt().toString() : null));
        joiner.add(nonNull(event.getCategory()));
        joiner.add(nonNull(event.getAction()));
        joiner.add(nonNull(event.getOutcome()));
        joiner.add(nonNull(event.getActorUserId()));
        joiner.add(nonNull(event.getActorName()));
        joiner.add(nonNull(event.getTargetUserId()));
        joiner.add(nonNull(event.getTeamId()));
        joiner.add(nonNull(event.getRoleId()));
        joiner.add(nonNull(event.getProjectId()));
        joiner.add(nonNull(event.getEntityType()));
        joiner.add(nonNull(event.getEntityId()));
        joiner.add(nonNull(event.getEntityName()));
        joiner.add(nonNull(event.getMessage()));
        joiner.add(nonNull(prevHash));
        return sha256Hex(joiner.toString());
    }

    private String sha256Hex(String source) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(source.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(hash.length * 2);
            for (byte value : hash) {
                builder.append(String.format(Locale.ROOT, "%02x", value));
            }
            return builder.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 not available", ex);
        }
    }

    private String nonNull(String value) {
        return Objects.requireNonNullElse(value, "");
    }
}
