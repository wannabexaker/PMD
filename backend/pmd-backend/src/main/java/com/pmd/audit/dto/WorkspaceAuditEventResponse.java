package com.pmd.audit.dto;

import java.time.Instant;

public record WorkspaceAuditEventResponse(
    String id,
    String workspaceId,
    Instant createdAt,
    String category,
    String action,
    String outcome,
    String actorUserId,
    String actorName,
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

