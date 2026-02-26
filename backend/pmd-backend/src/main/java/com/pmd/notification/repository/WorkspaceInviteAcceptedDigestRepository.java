package com.pmd.notification.repository;

import com.pmd.notification.model.WorkspaceInviteAcceptedDigestEntry;
import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceInviteAcceptedDigestRepository extends MongoRepository<WorkspaceInviteAcceptedDigestEntry, String> {
    List<WorkspaceInviteAcceptedDigestEntry> findByDeliveredAtIsNullAndCreatedAtBefore(Instant before);
}

