package com.pmd.workspace.preferences;

import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface WorkspacePanelPreferencesRepository
    extends MongoRepository<WorkspacePanelPreferences, String> {

    Optional<WorkspacePanelPreferences> findByWorkspaceIdAndUserId(String workspaceId, String userId);
}
