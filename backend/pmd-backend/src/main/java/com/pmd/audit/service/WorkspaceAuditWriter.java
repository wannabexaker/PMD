package com.pmd.audit.service;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import com.pmd.user.model.User;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.Objects;
import java.util.StringJoiner;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
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
 * <p>Each event stores the hash of the one before it. The hash covers the immutable facts of the
 * event — who (by opaque user id), what, when, against which entity — but deliberately NOT the
 * actor's display <em>name</em>, which is mutable personal data that erasure anonymises. Keeping
 * the name out of the hash lets a GDPR erasure blank it without corrupting the chain, while the
 * actor's identity stays protected through the id, which is hashed.
 *
 * <p>A unique index on {@code (workspaceId, prevEventHash)} makes the chain a real line rather
 * than a tree: two concurrent writes cannot both claim the same predecessor. The loser of that
 * race retries against the new tail (see {@link #log}), so the chain stays linear under
 * concurrency instead of silently forking.
 */
@Component
public class WorkspaceAuditWriter {

    private static final Logger logger = LoggerFactory.getLogger(WorkspaceAuditWriter.class);
    private static final int MAX_APPEND_ATTEMPTS = 6;

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
        for (int attempt = 1; attempt <= MAX_APPEND_ATTEMPTS; attempt++) {
            WorkspaceAuditEvent previous = auditRepository.findTopByWorkspaceIdOrderByCreatedAtDescIdDesc(request.workspaceId());
            String prevHash = previous != null ? blankToNull(previous.getEventHash()) : null;
            WorkspaceAuditEvent event = new WorkspaceAuditEvent();
            event.setWorkspaceId(request.workspaceId());
            // Truncate to milliseconds — BSON dates store only millis, so a nanosecond value
            // here would hash differently from what a verifier reads back and would report every
            // untampered event as edited.
            event.setCreatedAt(Instant.now().truncatedTo(ChronoUnit.MILLIS));
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
            try {
                mongoTemplate.insert(event);
                return;
            } catch (DuplicateKeyException ex) {
                // Another write claimed this predecessor first. Re-read the tail and re-link
                // rather than forking the chain. Under a low-traffic beta this is rare.
                logger.debug("Audit append lost the race for workspace {} (attempt {}), retrying",
                    request.workspaceId(), attempt);
            }
        }
        logger.error("Gave up appending an audit event for workspace {} after {} attempts",
            request.workspaceId(), MAX_APPEND_ATTEMPTS);
    }

    /**
     * Recomputes an event's hash from its stored fields and stored predecessor link. A verifier
     * compares this against the stored {@code eventHash} to detect after-the-fact edits.
     */
    public String recomputeHash(WorkspaceAuditEvent event) {
        return hashEvent(event, event.getPrevEventHash());
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
        // actorName is deliberately NOT hashed: it is mutable personal data that erasure
        // anonymises, and the actor is already pinned by the immutable id above.
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
