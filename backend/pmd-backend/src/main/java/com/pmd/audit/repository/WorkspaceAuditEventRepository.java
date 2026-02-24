package com.pmd.audit.repository;

import com.pmd.audit.model.WorkspaceAuditEvent;
import java.time.Instant;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceAuditEventRepository extends MongoRepository<WorkspaceAuditEvent, String> {
    WorkspaceAuditEvent findTopByWorkspaceIdOrderByCreatedAtDescIdDesc(String workspaceId);
    long deleteByCreatedAtBefore(Instant cutoff);
}
