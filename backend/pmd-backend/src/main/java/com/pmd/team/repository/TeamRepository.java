package com.pmd.team.repository;

import com.pmd.team.model.Team;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface TeamRepository extends MongoRepository<Team, String> {
    Optional<Team> findBySlug(String slug);
    Optional<Team> findBySlugAndWorkspaceId(String slug, String workspaceId);
    boolean existsBySlug(String slug);
    boolean existsBySlugAndWorkspaceId(String slug, String workspaceId);
    boolean existsByNameIgnoreCase(String name);
    boolean existsByNameIgnoreCaseAndWorkspaceId(String name, String workspaceId);
    List<Team> findByIsActiveTrue(Sort sort);
    List<Team> findByWorkspaceIdAndIsActiveTrue(String workspaceId, Sort sort);
    List<Team> findByWorkspaceId(String workspaceId);
    long countByWorkspaceId(String workspaceId);
    Optional<Team> findByIdAndWorkspaceId(String id, String workspaceId);
}
