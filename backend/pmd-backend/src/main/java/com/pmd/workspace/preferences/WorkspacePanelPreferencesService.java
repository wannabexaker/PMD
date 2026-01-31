package com.pmd.workspace.preferences;

import com.pmd.user.model.User;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WorkspacePanelPreferencesService {

    private final WorkspacePanelPreferencesRepository repository;

    public WorkspacePanelPreferencesService(WorkspacePanelPreferencesRepository repository) {
        this.repository = repository;
    }

    public WorkspacePanelPreferencesResponse getPreferences(String workspaceId, User user) {
        return repository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .map(WorkspacePanelPreferencesResponse::from)
            .orElseGet(WorkspacePanelPreferencesResponse::defaults);
    }

    public WorkspacePanelPreferencesResponse savePreferences(String workspaceId, User user,
                                                            WorkspacePanelPreferencesRequest request) {
        WorkspacePanelPreferences preferences = repository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .orElseGet(() -> {
                WorkspacePanelPreferences entity = new WorkspacePanelPreferences();
                entity.setWorkspaceId(workspaceId);
                entity.setUserId(user.getId());
                entity.setWorkspaceSummaryVisibility(normalize(request.getWorkspaceSummaryVisibility()));
                entity.setUpdatedAt(Instant.now());
                return entity;
            });
        preferences.setWorkspaceSummaryVisibility(normalize(request.getWorkspaceSummaryVisibility()));
        preferences.setUpdatedAt(Instant.now());
        WorkspacePanelPreferences saved = repository.save(preferences);
        return WorkspacePanelPreferencesResponse.from(saved);
    }

    private Map<String, Boolean> normalize(Map<String, Boolean> raw) {
        Map<String, Boolean> normalized = new LinkedHashMap<>();
        for (WorkspaceSummaryPanel panel : WorkspaceSummaryPanel.values()) {
            Boolean value = raw != null ? raw.get(panel.getKey()) : null;
            normalized.put(panel.getKey(), value == null ? true : value);
        }
        return normalized;
    }
}
