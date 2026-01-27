package com.pmd.project.repository;

import com.pmd.project.model.ProjectCommentEntity;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ProjectCommentRepository extends MongoRepository<ProjectCommentEntity, String> {
    Page<ProjectCommentEntity> findByProjectId(String projectId, Pageable pageable);
    List<ProjectCommentEntity> findByAuthorUserIdAndCreatedAtGreaterThanEqual(String authorUserId, Instant createdAt);
}
