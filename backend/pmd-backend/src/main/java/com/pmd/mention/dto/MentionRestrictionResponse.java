package com.pmd.mention.dto;

import java.time.Instant;

public record MentionRestrictionResponse(
    String userId,
    Instant blockedUntil,
    String reason,
    Instant updatedAt
) {}

