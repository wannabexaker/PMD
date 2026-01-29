package com.pmd.project.repository;

import com.pmd.project.model.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.domain.Sort;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByCreatedByUserIdIsNull();
    List<Project> findByCreatedByTeamIsNull();
    Optional<Project> findByName(String name);
    Optional<Project> findByWorkspaceIdAndName(String workspaceId, String name);
    List<Project> findByMemberIdsContaining(String memberId);
    List<Project> findByWorkspaceId(String workspaceId, Sort sort);
    Optional<Project> findByIdAndWorkspaceId(String id, String workspaceId);
    List<Project> findByWorkspaceIdAndMemberIdsContaining(String workspaceId, String memberId);
    List<Project> findByTeamIdIsNull();
}
