package com.pmd.workspace.repository;

import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceMemberRepository extends MongoRepository<WorkspaceMember, String> {
    List<WorkspaceMember> findByUserId(String userId);

    List<WorkspaceMember> findByWorkspaceId(String workspaceId);
    List<WorkspaceMember> findByWorkspaceIdAndStatus(String workspaceId, WorkspaceMemberStatus status);
    long countByWorkspaceId(String workspaceId);
    long countByWorkspaceIdAndStatus(String workspaceId, WorkspaceMemberStatus status);
    long deleteByWorkspaceId(String workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(String workspaceId, String userId);
}
