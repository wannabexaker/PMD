package com.pmd.audit.service;

import com.pmd.audit.config.AuditRetentionProperties;
import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class WorkspaceAuditRetentionService {

    private static final Logger logger = LoggerFactory.getLogger(WorkspaceAuditRetentionService.class);

    private final WorkspaceAuditEventRepository auditRepository;
    private final AuditRetentionProperties retentionProperties;

    public WorkspaceAuditRetentionService(WorkspaceAuditEventRepository auditRepository,
                                          AuditRetentionProperties retentionProperties) {
        this.auditRepository = auditRepository;
        this.retentionProperties = retentionProperties;
    }

    @Scheduled(cron = "0 31 3 * * *")
    public void cleanup() {
        int days = Math.max(30, retentionProperties.getDays());
        Instant cutoff = Instant.now().minus(days, ChronoUnit.DAYS);
        long deleted = auditRepository.deleteByCreatedAtBefore(cutoff);
        if (deleted > 0) {
            logger.info("Workspace audit retention cleanup removed {} events older than {} days", deleted, days);
        }
    }
}

