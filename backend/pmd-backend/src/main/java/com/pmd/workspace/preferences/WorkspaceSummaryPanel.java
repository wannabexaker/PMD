package com.pmd.workspace.preferences;

public enum WorkspaceSummaryPanel {

    UNASSIGNED("unassigned"),
    ASSIGNED("assigned"),
    IN_PROGRESS("inProgress"),
    COMPLETED("completed"),
    CANCELED("canceled"),
    ARCHIVED("archived");

    private final String key;

    WorkspaceSummaryPanel(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }
}
