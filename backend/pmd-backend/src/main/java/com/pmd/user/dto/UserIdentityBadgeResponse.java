package com.pmd.user.dto;

public class UserIdentityBadgeResponse {

    private String id;
    private String label;
    private String color;
    private int priority;

    public UserIdentityBadgeResponse() {
    }

    public UserIdentityBadgeResponse(String id, String label, String color, int priority) {
        this.id = id;
        this.label = label;
        this.color = color;
        this.priority = priority;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getLabel() {
        return label;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public int getPriority() {
        return priority;
    }

    public void setPriority(int priority) {
        this.priority = priority;
    }
}
