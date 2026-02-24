package com.pmd.audit.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "pmd.audit.retention")
public class AuditRetentionProperties {

    private int days = 365;

    public int getDays() {
        return days;
    }

    public void setDays(int days) {
        this.days = days;
    }
}

