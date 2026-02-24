package com.pmd.workspace.repository;

import com.pmd.workspace.model.WorkspaceRole;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceRoleRepository extends MongoRepository<WorkspaceRole, String> {
    List<WorkspaceRole> findByWorkspaceId(String workspaceId);
    long countByWorkspaceId(String workspaceId);
    Optional<WorkspaceRole> findByWorkspaceIdAndNameIgnoreCase(String workspaceId, String name);
    List<WorkspaceRole> findByWorkspaceIdAndIsSystem(String workspaceId, boolean isSystem);
}
