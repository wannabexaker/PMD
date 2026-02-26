package com.pmd.notification.repository;

import com.pmd.notification.model.WorkspaceJoinRequestEmailThrottle;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceJoinRequestEmailThrottleRepository extends MongoRepository<WorkspaceJoinRequestEmailThrottle, String> {
}

