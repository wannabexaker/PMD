package com.pmd.config.migration;

import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

@Component
public class DatabaseMigrationRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(DatabaseMigrationRunner.class);

    private final MigrationStateRepository migrationStateRepository;
    private final MongoTemplate mongoTemplate;

    public DatabaseMigrationRunner(MigrationStateRepository migrationStateRepository, MongoTemplate mongoTemplate) {
        this.migrationStateRepository = migrationStateRepository;
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        apply("2026-02-24-schema-version-backfill-v1", this::applySchemaVersionBackfill);
        apply("2026-02-24-index-foundation-v1", this::applyFoundationIndexes);
        apply("2026-02-24-workspace-guard-report-v1", this::applyWorkspaceGuardReport);
    }

    private void apply(String migrationId, Runnable migration) {
        if (migrationStateRepository.existsById(migrationId)) {
            return;
        }
        logger.info("Applying DB migration {}", migrationId);
        migration.run();
        MigrationState state = new MigrationState();
        state.setId(migrationId);
        state.setAppliedAt(Instant.now());
        migrationStateRepository.save(state);
        logger.info("Applied DB migration {}", migrationId);
    }

    private void applySchemaVersionBackfill() {
        List<String> collections = List.of(
            "users",
            "workspaces",
            "projects",
            "teams",
            "workspace_roles",
            "workspace_members",
            "workspace_invites",
            "workspace_join_requests",
            "project_comments",
            "user_notification_preferences"
        );
        Query query = Query.query(new Criteria().orOperator(Criteria.where("schemaVersion").exists(false), Criteria.where("schemaVersion").is(null)));
        Update update = new Update().set("schemaVersion", 1);
        for (String collection : collections) {
            mongoTemplate.updateMulti(query, update, collection);
        }
    }

    private void applyFoundationIndexes() {
        ensureIndex("projects", new Index().on("workspaceId", Sort.Direction.ASC).on("status", Sort.Direction.ASC).named("idx_projects_workspace_status"));
        ensureIndex("projects", new Index().on("workspaceId", Sort.Direction.ASC).on("teamId", Sort.Direction.ASC).named("idx_projects_workspace_team"));
        ensureIndex("projects", new Index().on("workspaceId", Sort.Direction.ASC).on("updatedAt", Sort.Direction.DESC).named("idx_projects_workspace_updated"));
        ensureIndex("teams", new Index().on("workspaceId", Sort.Direction.ASC).on("slug", Sort.Direction.ASC).unique().named("uniq_teams_workspace_slug"));
        ensureIndex("workspace_roles", new Index().on("workspaceId", Sort.Direction.ASC).on("name", Sort.Direction.ASC).unique().named("uniq_workspace_roles_workspace_name"));
        ensureIndex("workspace_members", new Index().on("workspaceId", Sort.Direction.ASC).on("userId", Sort.Direction.ASC).unique().named("uniq_workspace_members_workspace_user"));
        ensureIndex("workspace_audit_events", new Index().on("workspaceId", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC).named("idx_workspace_audit_workspace_created"));
        ensureIndex("auth_sessions", new Index().on("expiresAt", Sort.Direction.ASC).expire(0).named("ttl_auth_sessions_expires"));
        ensureIndex("auth_sessions", new Index().on("userId", Sort.Direction.ASC).on("revokedAt", Sort.Direction.ASC).named("idx_auth_sessions_user_revoked"));
        ensureIndex("auth_security_events", new Index().on("createdAt", Sort.Direction.ASC).expire(180L * 24 * 60 * 60).named("ttl_auth_security_events_created"));
        ensureIndex("auth_security_events", new Index().on("eventType", Sort.Direction.ASC).on("createdAt", Sort.Direction.DESC).named("idx_auth_security_event_type_created"));
    }

    private void applyWorkspaceGuardReport() {
        List<String> scopedCollections = List.of(
            "projects",
            "teams",
            "workspace_roles",
            "workspace_members",
            "workspace_invites",
            "workspace_join_requests",
            "workspace_audit_events"
        );
        Query missingWorkspaceQuery = Query.query(new Criteria().orOperator(
            Criteria.where("workspaceId").exists(false),
            Criteria.where("workspaceId").is(null),
            Criteria.where("workspaceId").is("")
        ));
        for (String collection : scopedCollections) {
            long count = mongoTemplate.count(missingWorkspaceQuery, collection);
            if (count > 0) {
                logger.warn("Workspace guard report: collection '{}' has {} docs without workspaceId", collection, count);
            }
        }
    }

    private void ensureIndex(String collectionName, Index index) {
        IndexOperations indexOps = mongoTemplate.indexOps(collectionName);
        indexOps.ensureIndex(index);
    }
}
