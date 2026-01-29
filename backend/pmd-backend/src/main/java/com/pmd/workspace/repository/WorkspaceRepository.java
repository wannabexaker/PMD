package com.pmd.workspace.repository;

import com.pmd.workspace.model.Workspace;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspaceRepository extends MongoRepository<Workspace, String> {
    Optional<Workspace> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsByNameIgnoreCase(String name);
}
