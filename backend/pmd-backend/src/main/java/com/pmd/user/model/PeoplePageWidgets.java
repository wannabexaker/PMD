package com.pmd.user.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class PeoplePageWidgets {

    public static final String WIDGET_PROJECTS_BY_STATUS = "projectsByStatus";
    public static final String WIDGET_ACTIVE_VS_INACTIVE = "activeVsInactive";

    private static final List<String> DEFAULT_VISIBLE =
        List.of(WIDGET_PROJECTS_BY_STATUS, WIDGET_ACTIVE_VS_INACTIVE);

    private static final List<String> DEFAULT_ORDER =
        List.of(WIDGET_PROJECTS_BY_STATUS, WIDGET_ACTIVE_VS_INACTIVE);

    private static final Map<String, Map<String, List<String>>> DEFAULT_CONFIG = Map.of(
        WIDGET_PROJECTS_BY_STATUS,
        Map.of("statuses", List.of("Not started", "In progress", "Completed", "Canceled", "Archived"))
    );

    private static final Set<String> ALLOWED_WIDGETS =
        Set.of(WIDGET_PROJECTS_BY_STATUS, WIDGET_ACTIVE_VS_INACTIVE);

    private List<String> visible = new ArrayList<>();

    private List<String> order = new ArrayList<>();

    private Map<String, Map<String, List<String>>> config = new HashMap<>();

    public PeoplePageWidgets() {
    }

    public PeoplePageWidgets(List<String> visible, List<String> order, Map<String, Map<String, List<String>>> config) {
        this.visible = visible != null ? visible : new ArrayList<>();
        this.order = order != null ? order : new ArrayList<>();
        this.config = config != null ? config : new HashMap<>();
    }

    public static PeoplePageWidgets defaults() {
        return new PeoplePageWidgets(new ArrayList<>(DEFAULT_VISIBLE), new ArrayList<>(DEFAULT_ORDER),
            deepCopyConfig(DEFAULT_CONFIG));
    }

    public PeoplePageWidgets mergeWithDefaults() {
        PeoplePageWidgets defaults = defaults();
        List<String> mergedVisible = sanitizeList(this.visible, defaults.visible);
        List<String> mergedOrder = sanitizeList(this.order, defaults.order);
        mergedOrder = ensureOrderContainsVisible(mergedOrder, mergedVisible);

        Map<String, Map<String, List<String>>> mergedConfig = deepCopyConfig(defaults.config);
        if (this.config != null) {
            for (Map.Entry<String, Map<String, List<String>>> entry : this.config.entrySet()) {
                if (!ALLOWED_WIDGETS.contains(entry.getKey()) || entry.getValue() == null) {
                    continue;
                }
                Map<String, List<String>> mergedWidgetConfig = new HashMap<>(mergedConfig.getOrDefault(entry.getKey(),
                    new HashMap<>()));
                for (Map.Entry<String, List<String>> configEntry : entry.getValue().entrySet()) {
                    if (configEntry.getValue() != null) {
                        mergedWidgetConfig.put(configEntry.getKey(), new ArrayList<>(configEntry.getValue()));
                    }
                }
                mergedConfig.put(entry.getKey(), mergedWidgetConfig);
            }
        }

        return new PeoplePageWidgets(mergedVisible, mergedOrder, mergedConfig);
    }

    private static List<String> sanitizeList(List<String> input, List<String> fallback) {
        if (input == null || input.isEmpty()) {
            return new ArrayList<>(fallback);
        }
        List<String> cleaned = input.stream()
            .filter(ALLOWED_WIDGETS::contains)
            .distinct()
            .toList();
        if (cleaned.isEmpty()) {
            return new ArrayList<>(fallback);
        }
        return new ArrayList<>(cleaned);
    }

    private static List<String> ensureOrderContainsVisible(List<String> order, List<String> visible) {
        List<String> next = new ArrayList<>(order);
        for (String widgetId : visible) {
            if (!next.contains(widgetId)) {
                next.add(widgetId);
            }
        }
        return next;
    }

    private static Map<String, Map<String, List<String>>> deepCopyConfig(
        Map<String, Map<String, List<String>>> config) {
        Map<String, Map<String, List<String>>> copy = new HashMap<>();
        if (config == null) {
            return copy;
        }
        for (Map.Entry<String, Map<String, List<String>>> entry : config.entrySet()) {
            Map<String, List<String>> innerCopy = new HashMap<>();
            if (entry.getValue() != null) {
                for (Map.Entry<String, List<String>> inner : entry.getValue().entrySet()) {
                    innerCopy.put(inner.getKey(), inner.getValue() != null ? new ArrayList<>(inner.getValue())
                        : new ArrayList<>());
                }
            }
            copy.put(entry.getKey(), innerCopy);
        }
        return copy;
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
