package com.pmd.mention.repository;

import com.pmd.mention.model.MentionRestriction;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface MentionRestrictionRepository extends MongoRepository<MentionRestriction, String> {

    Optional<MentionRestriction> findByWorkspaceIdAndUserId(String workspaceId, String userId);

    List<MentionRestriction> findByWorkspaceId(String workspaceId);
}

