package com.pmd.person.dto;

public class RecommendationToggleResponse {

    private String personId;

    private int recommendedCount;

    private boolean recommendedByMe;

    public RecommendationToggleResponse() {
    }

    public RecommendationToggleResponse(String personId, int recommendedCount, boolean recommendedByMe) {
        this.personId = personId;
        this.recommendedCount = recommendedCount;
        this.recommendedByMe = recommendedByMe;
    }

    public String getPersonId() {
        return personId;
    }

    public void setPersonId(String personId) {
        this.personId = personId;
    }

    public int getRecommendedCount() {
        return recommendedCount;
    }

    public void setRecommendedCount(int recommendedCount) {
        this.recommendedCount = recommendedCount;
    }

    public boolean isRecommendedByMe() {
        return recommendedByMe;
    }

    public void setRecommendedByMe(boolean recommendedByMe) {
        this.recommendedByMe = recommendedByMe;
    }
}

