package com.pmd.stats.dto;

import java.util.List;

public class PeopleUserStatsResponse {

    private String userId;
    private PeopleUserPies pies;

    public PeopleUserStatsResponse() {
    }

    public PeopleUserStatsResponse(String userId, PeopleUserPies pies) {
        this.userId = userId;
        this.pies = pies;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public PeopleUserPies getPies() {
        return pies;
    }

    public void setPies(PeopleUserPies pies) {
        this.pies = pies;
    }

    public static class PeopleUserPies {
        private List<StatSlice> projectsByStatus;
        private List<StatSlice> activeInactive;

        public PeopleUserPies() {
        }

        public PeopleUserPies(List<StatSlice> projectsByStatus, List<StatSlice> activeInactive) {
            this.projectsByStatus = projectsByStatus;
            this.activeInactive = activeInactive;
        }

        public List<StatSlice> getProjectsByStatus() {
            return projectsByStatus;
        }

        public void setProjectsByStatus(List<StatSlice> projectsByStatus) {
            this.projectsByStatus = projectsByStatus;
        }

        public List<StatSlice> getActiveInactive() {
            return activeInactive;
        }

        public void setActiveInactive(List<StatSlice> activeInactive) {
            this.activeInactive = activeInactive;
        }
    }
}
