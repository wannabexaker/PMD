package com.pmd.audit.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.pmd.audit.model.WorkspaceAuditEvent;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import com.pmd.workspace.service.WorkspaceService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;

/**
 * The privacy notice tells users the operator can enter any workspace. These tests are what
 * make that statement checkable rather than a promise: entry has to leave a record, in the
 * members' own audit log.
 */
@SpringBootTest
class AdminAccessAuditServiceTest {

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MongoTemplate mongoTemplate;

    private String workspaceId;

    @BeforeEach
    void setup() {
        mongoTemplate.remove(new Query(), WorkspaceAuditEvent.class);
        Workspace workspace = new Workspace();
        workspace.setName("Someone else's workspace");
        workspace.setSlug("admin-access-test-" + System.nanoTime());
        workspaceId = workspaceRepository.save(workspace).getId();
    }

    private User admin(String email) {
        User user = new User();
        user.setUsername(email);
        user.setEmail(email);
        user.setDisplayName("Platform Admin");
        user.setAdmin(true);
        return userRepository.save(user);
    }

    private List<WorkspaceAuditEvent> accessEvents() {
        return mongoTemplate.find(
            new Query(new Criteria().andOperator(
                Criteria.where("workspaceId").is(workspaceId),
                Criteria.where("action").is(AdminAccessAuditService.ACTION))),
            WorkspaceAuditEvent.class);
    }

    @Test
    void recordsAdminEntryIntoAWorkspaceTheyAreNotAMemberOf() {
        User operator = admin("break-glass-" + System.nanoTime() + "@pmd.local");

        workspaceService.requireActiveMembership(workspaceId, operator);

        assertThat(accessEvents()).singleElement().satisfies(event -> {
            assertThat(event.getActorUserId()).isEqualTo(operator.getId());
            assertThat(event.getCategory()).isEqualTo(AdminAccessAuditService.CATEGORY);
            // The entry has to survive tampering to be worth anything.
            assertThat(event.getEventHash()).isNotBlank();
        });
    }

    @Test
    void collapsesRepeatEntriesWithinTheWindow() {
        User operator = admin("repeat-" + System.nanoTime() + "@pmd.local");

        // Membership is re-checked on essentially every request; one page view must not
        // produce one row per call, or the log becomes unreadable.
        for (int i = 0; i < 5; i++) {
            workspaceService.requireActiveMembership(workspaceId, operator);
        }

        assertThat(accessEvents()).hasSize(1);
    }

    @Test
    void doesNotRecordWhenTheAdminIsAGenuineMember() {
        User operator = admin("member-" + System.nanoTime() + "@pmd.local");
        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(workspaceId);
        member.setUserId(operator.getId());
        member.setRole(WorkspaceMemberRole.OWNER);
        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        workspaceMemberRepository.save(member);

        workspaceService.requireActiveMembership(workspaceId, operator);

        // They got in the ordinary way. Recording this would bury the operator's own
        // workspaces in noise and hide the entries that actually matter.
        assertThat(accessEvents()).isEmpty();
    }
}
