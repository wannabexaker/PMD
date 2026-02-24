package com.pmd.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.Collectors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.IndexInfo;

@SpringBootTest
class DatabaseIndexGateTest {

    @Autowired
    private MongoTemplate mongoTemplate;

    @Test
    void shouldHaveCriticalIndexes() {
        assertIndexPresent("projects", "idx_projects_workspace_status");
        assertIndexPresent("projects", "idx_projects_workspace_team");
        assertIndexPresent("projects", "idx_projects_workspace_created");
        assertIndexPresent("teams", "uniq_teams_workspace_slug");
        assertIndexPresent("teams", "idx_teams_workspace_active_name");
        assertIndexPresent("workspace_roles", "idx_workspace_roles_workspace_system_name");
        assertIndexPresent("workspace_members", "uniq_workspace_members_workspace_user");
        assertIndexPresent("workspace_invites", "idx_workspace_invites_workspace_revoked_expires");
        assertIndexPresent("workspace_join_requests", "idx_workspace_join_requests_workspace_status_created");
        assertIndexPresent("workspace_audit_events", "idx_workspace_audit_workspace_action_created");
        assertIndexPresent("auth_sessions", "ttl_auth_sessions_expires");
        assertIndexPresent("auth_security_events", "ttl_auth_security_events_created");
    }

    private void assertIndexPresent(String collection, String indexName) {
        List<String> names = mongoTemplate.indexOps(collection).getIndexInfo().stream()
            .map(IndexInfo::getName)
            .collect(Collectors.toList());
        assertThat(names)
            .withFailMessage("Expected index '%s' on collection '%s'. Existing indexes: %s", indexName, collection, names)
            .contains(indexName);
    }
}
