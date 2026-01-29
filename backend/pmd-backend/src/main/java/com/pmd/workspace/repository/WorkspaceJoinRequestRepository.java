package com.pmd.workspace.repository;

import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceJoinRequestRepository extends MongoRepository<WorkspaceJoinRequest, String> {
    List<WorkspaceJoinRequest> findByWorkspaceIdAndStatus(String workspaceId, WorkspaceJoinRequestStatus status);
    Optional<WorkspaceJoinRequest> findByWorkspaceIdAndUserId(String workspaceId, String userId);
}
