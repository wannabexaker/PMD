package com.pmd.mention.repository;

import com.pmd.mention.model.MentionAuditEvent;
import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MentionAuditEventRepository extends MongoRepository<MentionAuditEvent, String> {

    List<MentionAuditEvent> findByWorkspaceIdAndEveryoneMentionIsTrueAndOutcomeAndCreatedAtAfter(
        String workspaceId,
        String outcome,
        Instant createdAt
    );

    long countByWorkspaceIdAndActorUserIdAndOutcomeAndCreatedAtAfter(
        String workspaceId,
        String actorUserId,
        String outcome,
        Instant createdAt
    );

    List<MentionAuditEvent> findTop100ByWorkspaceIdOrderByCreatedAtDesc(String workspaceId);

    List<MentionAuditEvent> findTop100ByWorkspaceIdAndActorUserIdOrderByCreatedAtDesc(String workspaceId, String actorUserId);
}
