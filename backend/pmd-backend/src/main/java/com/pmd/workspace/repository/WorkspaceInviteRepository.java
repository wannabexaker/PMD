package com.pmd.workspace.repository;

import com.pmd.workspace.model.WorkspaceInvite;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceInviteRepository extends MongoRepository<WorkspaceInvite, String> {
    Optional<WorkspaceInvite> findByToken(String token);
    Optional<WorkspaceInvite> findByCode(String code);
}
