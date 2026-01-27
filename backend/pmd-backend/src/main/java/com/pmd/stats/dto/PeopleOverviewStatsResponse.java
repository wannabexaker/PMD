package com.pmd.stats.dto;

import java.util.List;

public class PeopleOverviewStatsResponse {

    private PeopleOverviewPies pies;

    public PeopleOverviewStatsResponse() {
    }

    public PeopleOverviewStatsResponse(PeopleOverviewPies pies) {
        this.pies = pies;
    }

    public PeopleOverviewPies getPies() {
        return pies;
    }

    public void setPies(PeopleOverviewPies pies) {
        this.pies = pies;
    }

    public static class PeopleOverviewPies {
        private List<StatSlice> peopleByTeam;
        private List<StatSlice> workloadByTeam;

        public PeopleOverviewPies() {
        }

        public PeopleOverviewPies(List<StatSlice> peopleByTeam, List<StatSlice> workloadByTeam) {
            this.peopleByTeam = peopleByTeam;
            this.workloadByTeam = workloadByTeam;
        }

        public List<StatSlice> getPeopleByTeam() {
            return peopleByTeam;
        }

        public void setPeopleByTeam(List<StatSlice> peopleByTeam) {
            this.peopleByTeam = peopleByTeam;
        }

        public List<StatSlice> getWorkloadByTeam() {
            return workloadByTeam;
        }

        public void setWorkloadByTeam(List<StatSlice> workloadByTeam) {
            this.workloadByTeam = workloadByTeam;
        }
    }
}
