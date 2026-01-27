package com.pmd.auth.dto;

import java.util.List;
import java.util.Map;

public class PeoplePageWidgetsRequest {

    private List<String> visible;

    private List<String> order;

    private Map<String, Map<String, List<String>>> config;

    public PeoplePageWidgetsRequest() {
    }

    public PeoplePageWidgetsRequest(List<String> visible, List<String> order,
                                    Map<String, Map<String, List<String>>> config) {
        this.visible = visible;
        this.order = order;
        this.config = config;
    }

    public List<String> getVisible() {
        return visible;
    }

    public void setVisible(List<String> visible) {
        this.visible = visible;
    }

    public List<String> getOrder() {
        return order;
    }

    public void setOrder(List<String> order) {
        this.order = order;
    }

    public Map<String, Map<String, List<String>>> getConfig() {
        return config;
    }

    public void setConfig(Map<String, Map<String, List<String>>> config) {
        this.config = config;
    }
}
