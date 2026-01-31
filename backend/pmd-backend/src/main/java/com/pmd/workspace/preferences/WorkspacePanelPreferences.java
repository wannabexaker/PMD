package com.pmd.workspace.preferences;

import java.time.Instant;
import java.util.Map;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("workspace_panel_preferences")
public class WorkspacePanelPreferences {

    @Id
    private String id;

    @Indexed
    private String workspaceId;

    @Indexed
    private String userId;

    private Map<String, Boolean> workspaceSummaryVisibility;

    private Instant updatedAt;

    public WorkspacePanelPreferences() {
    }

    public WorkspacePanelPreferences(String workspaceId, String userId, Map<String, Boolean> workspaceSummaryVisibility,
                                     Instant updatedAt) {
        this.workspaceId = workspaceId;
        this.userId = userId;
        this.workspaceSummaryVisibility = workspaceSummaryVisibility;
        this.updatedAt = updatedAt;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public Map<String, Boolean> getWorkspaceSummaryVisibility() {
        return workspaceSummaryVisibility;
    }

    public void setWorkspaceSummaryVisibility(Map<String, Boolean> workspaceSummaryVisibility) {
        this.workspaceSummaryVisibility = workspaceSummaryVisibility;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
