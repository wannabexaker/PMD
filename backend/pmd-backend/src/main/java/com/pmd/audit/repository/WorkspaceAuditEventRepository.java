package com.pmd.audit.repository;

import com.pmd.audit.model.WorkspaceAuditEvent;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceAuditEventRepository extends MongoRepository<WorkspaceAuditEvent, String> {
}

