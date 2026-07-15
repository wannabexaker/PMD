package com.pmd.audit.service;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.user.model.User;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

/**
 * Records when a platform administrator enters a workspace they are not a member of.
 *
 * <p>The privacy notice tells users the operator can enter any workspace to run the service.
 * Until now that access left no trace at all — only writes were audited, so merely reading
 * someone's projects was invisible. Disclosure without a record is only worth the operator's
 * word; this makes the claim checkable by the people it is made to.
 *
 * <p>The event goes into the workspace's own hash-chained audit log rather than somewhere
 * only the operator can see, which is the whole point: the members it concerns can read it,
 * and removing an entry breaks the chain.
 */
@Service
public class AdminAccessAuditService {

    private static final Logger logger = LoggerFactory.getLogger(AdminAccessAuditService.class);

    public static final String CATEGORY = "SECURITY";
    public static final String ACTION = "PLATFORM_ADMIN_ACCESS";

    /**
     * One entry per admin per workspace per window, not one per HTTP request.
     * Membership is re-checked on nearly every call, so recording each one would bury the
     * members' own history under thousands of rows and hammer the disk for no extra truth:
     * "the operator was in here during this hour" is the fact worth keeping.
     */
    private static final Duration DEDUPE_WINDOW = Duration.ofHours(1);

    private final WorkspaceAuditWriter writer;
    private final MongoTemplate mongoTemplate;

    public AdminAccessAuditService(WorkspaceAuditWriter writer, MongoTemplate mongoTemplate) {
        this.writer = writer;
        this.mongoTemplate = mongoTemplate;
    }

    /**
     * Called on the membership check, so it must never break the request it is observing:
     * a failure to record is logged and swallowed. Losing an audit row is bad; a 500 on
     * every workspace page because Mongo hiccuped would be worse.
     */
    public void recordWorkspaceEntry(User admin, String workspaceId) {
        if (admin == null || workspaceId == null || workspaceId.isBlank()) {
            return;
        }
        try {
            if (recordedRecently(admin.getId(), workspaceId)) {
                return;
            }
            writer.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
                workspaceId,
                CATEGORY,
                ACTION,
                "SUCCESS",
                admin,
                null, null, null, null,
                "WORKSPACE",
                workspaceId,
                null,
                "Platform administrator accessed this workspace without being a member."
            ));
            logger.info("Recorded platform-admin access to workspace {} by {}", workspaceId, admin.getId());
        } catch (RuntimeException ex) {
            logger.error("Failed to record platform-admin access to workspace {}", workspaceId, ex);
        }
    }

    private boolean recordedRecently(String adminUserId, String workspaceId) {
        Query query = new Query(new Criteria().andOperator(
            Criteria.where("workspaceId").is(workspaceId),
            Criteria.where("actorUserId").is(adminUserId),
            Criteria.where("action").is(ACTION),
            Criteria.where("createdAt").gt(Instant.now().minus(DEDUPE_WINDOW))
        ));
        return mongoTemplate.exists(query, WorkspaceAuditEvent.class);
    }
}
