package com.pmd.workspace.preferences;

import java.util.Map;

public class WorkspacePanelPreferencesRequest {

    private Map<String, Boolean> workspaceSummaryVisibility;

    public WorkspacePanelPreferencesRequest() {
    }

    public WorkspacePanelPreferencesRequest(Map<String, Boolean> workspaceSummaryVisibility) {
        this.workspaceSummaryVisibility = workspaceSummaryVisibility;
    }

    public Map<String, Boolean> getWorkspaceSummaryVisibility() {
        return workspaceSummaryVisibility;
    }

    public void setWorkspaceSummaryVisibility(Map<String, Boolean> workspaceSummaryVisibility) {
        this.workspaceSummaryVisibility = workspaceSummaryVisibility;
    }
}
