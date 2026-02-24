package com.pmd.mention.dto;

import java.time.Instant;
import java.util.List;

public record MentionAuditEventResponse(
    String workspaceId,
    String projectId,
    String actorUserId,
    String source,
    String outcome,
    String detail,
    boolean everyoneMention,
    int mentionTargetCount,
    List<String> targets,
    Instant createdAt
) {}

