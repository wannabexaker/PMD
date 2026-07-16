package com.pmd.audit.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.audit.repository.WorkspaceAuditEventRepository;
import com.pmd.user.model.User;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

/**
 * The audit chain is only worth its legal claim if it is verifiable AND survives a GDPR erasure.
 * These pin both: an untouched chain verifies, anonymising an actor's NAME (what erasure does)
 * keeps it intact because the name is not hashed, and editing a hashed field or deleting a row
 * is detected.
 */
@SpringBootTest
class AuditChainVerifierTest {

    @Autowired
    private WorkspaceAuditWriter writer;

    @Autowired
    private AuditChainVerifier verifier;

    @Autowired
    private WorkspaceAuditEventRepository auditRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    private String appendChain(int events) {
        String workspaceId = "ws-verify-" + System.nanoTime();
        User actor = new User();
        actor.setId("actor-" + System.nanoTime());
        actor.setDisplayName("Alice Actor");
        for (int i = 0; i < events; i++) {
            writer.log(new WorkspaceAuditService.WorkspaceAuditWriteRequest(
                workspaceId, "SECURITY", "ACTION_" + i, "SUCCESS", actor,
                null, null, null, null, "ENTITY", "e" + i, "Entity " + i, "msg " + i));
        }
        return workspaceId;
    }

    @Test
    void anUntouchedChainVerifies() {
        String workspaceId = appendChain(4);
        AuditChainVerifier.Result result = verifier.verify(workspaceId);
        assertThat(result.intact()).isTrue();
        assertThat(result.eventsChecked()).isEqualTo(4);
    }

    @Test
    void anonymisingTheActorNameKeepsTheChainIntact() {
        String workspaceId = appendChain(3);
        // Exactly what account erasure does: blank the display name on retained rows.
        mongoTemplate.updateMulti(
            new Query(Criteria.where("workspaceId").is(workspaceId)),
            new Update().set("actorName", "Deleted user"),
            WorkspaceAuditEvent.class);

        assertThat(verifier.verify(workspaceId).intact()).isTrue();
    }

    @Test
    void editingAHashedFieldIsDetected() {
        String workspaceId = appendChain(3);
        WorkspaceAuditEvent middle = auditRepository.findByWorkspaceIdOrderByCreatedAtAscIdAsc(workspaceId).get(1);
        // Tamper with a hashed field without recomputing the hash.
        mongoTemplate.updateFirst(
            new Query(Criteria.where("_id").is(middle.getId())),
            new Update().set("action", "TAMPERED"),
            WorkspaceAuditEvent.class);

        AuditChainVerifier.Result result = verifier.verify(workspaceId);
        assertThat(result.intact()).isFalse();
        assertThat(result.brokenEventId()).isEqualTo(middle.getId());
    }

    @Test
    void deletingARowIsDetected() {
        String workspaceId = appendChain(4);
        List<WorkspaceAuditEvent> events = auditRepository.findByWorkspaceIdOrderByCreatedAtAscIdAsc(workspaceId);
        // Remove a middle event: its successor's predecessor link now dangles.
        mongoTemplate.remove(
            new Query(Criteria.where("_id").is(events.get(1).getId())),
            WorkspaceAuditEvent.class);

        assertThat(verifier.verify(workspaceId).intact()).isFalse();
    }
}
