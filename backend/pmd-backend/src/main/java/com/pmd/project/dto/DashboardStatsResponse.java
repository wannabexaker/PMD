package com.pmd.project.dto;

import java.util.List;

public class DashboardStatsResponse {

    private List<StatSlice> statusBreakdown;

    private List<StatSlice> workloadBreakdown;

    private List<StatSlice> activeInactiveBreakdown;

    public DashboardStatsResponse() {
    }

    public DashboardStatsResponse(List<StatSlice> statusBreakdown, List<StatSlice> workloadBreakdown,
                                  List<StatSlice> activeInactiveBreakdown) {
        this.statusBreakdown = statusBreakdown;
        this.workloadBreakdown = workloadBreakdown;
        this.activeInactiveBreakdown = activeInactiveBreakdown;
    }

    public List<StatSlice> getStatusBreakdown() {
        return statusBreakdown;
    }

    public void setStatusBreakdown(List<StatSlice> statusBreakdown) {
        this.statusBreakdown = statusBreakdown;
    }

    public List<StatSlice> getWorkloadBreakdown() {
        return workloadBreakdown;
    }

    public void setWorkloadBreakdown(List<StatSlice> workloadBreakdown) {
        this.workloadBreakdown = workloadBreakdown;
    }

    public List<StatSlice> getActiveInactiveBreakdown() {
        return activeInactiveBreakdown;
    }

    public void setActiveInactiveBreakdown(List<StatSlice> activeInactiveBreakdown) {
        this.activeInactiveBreakdown = activeInactiveBreakdown;
    }

    public static class StatSlice {
        private String label;
        private long value;

        public StatSlice() {
        }

        public StatSlice(String label, long value) {
            this.label = label;
            this.value = value;
        }

        public String getLabel() {
            return label;
        }

        public void setLabel(String label) {
            this.label = label;
        }

        public long getValue() {
            return value;
        }

        public void setValue(long value) {
            this.value = value;
        }
    }
}
