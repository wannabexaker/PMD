package com.pmd.audit.repository;

import com.pmd.audit.model.WorkspaceAuditEvent;
import java.time.Instant;
import java.util.List;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceAuditEventRepository extends MongoRepository<WorkspaceAuditEvent, String> {
    WorkspaceAuditEvent findTopByWorkspaceIdOrderByCreatedAtDescIdDesc(String workspaceId);
    List<WorkspaceAuditEvent> findByWorkspaceIdOrderByCreatedAtAscIdAsc(String workspaceId);
    long countByWorkspaceId(String workspaceId);
    long deleteByWorkspaceId(String workspaceId);
    long deleteByCreatedAtBefore(Instant cutoff);
}
