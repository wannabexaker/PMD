package com.pmd.workspace.preferences;

import java.util.LinkedHashMap;
import java.util.Map;

public class WorkspacePanelPreferencesResponse {

    private Map<String, Boolean> workspaceSummaryVisibility;

    public WorkspacePanelPreferencesResponse() {
    }

    public WorkspacePanelPreferencesResponse(Map<String, Boolean> workspaceSummaryVisibility) {
        this.workspaceSummaryVisibility = workspaceSummaryVisibility;
    }

    public Map<String, Boolean> getWorkspaceSummaryVisibility() {
        return workspaceSummaryVisibility;
    }

    public void setWorkspaceSummaryVisibility(Map<String, Boolean> workspaceSummaryVisibility) {
        this.workspaceSummaryVisibility = workspaceSummaryVisibility;
    }

    public static WorkspacePanelPreferencesResponse defaults() {
        Map<String, Boolean> defaultMap = new LinkedHashMap<>();
        for (WorkspaceSummaryPanel panel : WorkspaceSummaryPanel.values()) {
            defaultMap.put(panel.getKey(), true);
        }
        return new WorkspacePanelPreferencesResponse(defaultMap);
    }

    public static WorkspacePanelPreferencesResponse from(WorkspacePanelPreferences entity) {
        if (entity == null || entity.getWorkspaceSummaryVisibility() == null) {
            return defaults();
        }
        return new WorkspacePanelPreferencesResponse(entity.getWorkspaceSummaryVisibility());
    }
}
