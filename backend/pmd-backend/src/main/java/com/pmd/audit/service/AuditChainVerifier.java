package com.pmd.audit.service;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * Checks a workspace's audit log against its hash chain.
 *
 * <p>This is what turns the chain from decoration into evidence: without a verifier, tampered
 * rows are never noticed. It detects three things — a row whose content was edited after the
 * fact (its stored hash no longer matches a recompute), a row that was deleted (a successor's
 * predecessor link points at a hash that is no longer present), and a fork (two rows claiming
 * the same predecessor, which the write-time unique index should already prevent).
 *
 * <p>What it does NOT defend against: an operator with database root who rewrites the whole
 * chain from the genesis. That bound is stated honestly in the privacy notice; the chain
 * protects against selective edits, not against total reconstruction by the host.
 */
@Component
public class AuditChainVerifier {

    private final WorkspaceAuditEventRepository auditRepository;
    private final WorkspaceAuditWriter auditWriter;

    public AuditChainVerifier(WorkspaceAuditEventRepository auditRepository, WorkspaceAuditWriter auditWriter) {
        this.auditRepository = auditRepository;
        this.auditWriter = auditWriter;
    }

    public Result verify(String workspaceId) {
        List<WorkspaceAuditEvent> events = auditRepository.findByWorkspaceIdOrderByCreatedAtAscIdAsc(workspaceId);
        if (events.isEmpty()) {
            return Result.intact(0);
        }

        // 1. Content integrity: each stored hash must match a fresh recompute of its own fields.
        for (WorkspaceAuditEvent event : events) {
            if (!auditWriter.recomputeHash(event).equals(orEmpty(event.getEventHash()))) {
                return Result.broken(event.getId(), "content of an event was edited after it was written");
            }
        }

        // 2. Structure: exactly one genesis, every non-genesis link resolves, no forks.
        Set<String> hashes = new HashSet<>();
        Map<String, Integer> predecessorUse = new HashMap<>();
        int genesisCount = 0;
        for (WorkspaceAuditEvent event : events) {
            hashes.add(orEmpty(event.getEventHash()));
            String prev = event.getPrevEventHash();
            if (prev == null || prev.isBlank()) {
                genesisCount++;
            } else {
                predecessorUse.merge(prev, 1, Integer::sum);
            }
        }
        if (genesisCount != 1) {
            return Result.broken(null, "expected exactly one starting event, found " + genesisCount);
        }
        for (WorkspaceAuditEvent event : events) {
            String prev = event.getPrevEventHash();
            if (prev != null && !prev.isBlank() && !hashes.contains(prev)) {
                return Result.broken(event.getId(), "an earlier event referenced by this one is missing (deleted?)");
            }
        }
        for (Map.Entry<String, Integer> entry : predecessorUse.entrySet()) {
            if (entry.getValue() > 1) {
                return Result.broken(null, "two events share a predecessor (forked chain)");
            }
        }
        return Result.intact(events.size());
    }

    private static String orEmpty(String value) {
        return value == null ? "" : value;
    }

    /** Outcome of a verification: intact, or broken with the offending event and why. */
    public record Result(boolean intact, int eventsChecked, String brokenEventId, String detail) {
        static Result intact(int count) {
            return new Result(true, count, null, null);
        }

        static Result broken(String eventId, String detail) {
            return new Result(false, 0, eventId, detail);
        }
    }
}
