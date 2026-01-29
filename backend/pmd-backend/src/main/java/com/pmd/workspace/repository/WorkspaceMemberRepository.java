package com.pmd.workspace.repository;

import com.pmd.workspace.model.WorkspaceMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceMemberRepository extends MongoRepository<WorkspaceMember, String> {
    List<WorkspaceMember> findByUserId(String userId);

    List<WorkspaceMember> findByWorkspaceId(String workspaceId);

    Optional<WorkspaceMember> findByWorkspaceIdAndUserId(String workspaceId, String userId);
}
