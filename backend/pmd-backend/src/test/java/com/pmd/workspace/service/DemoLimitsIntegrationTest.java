package com.pmd.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pmd.person.repository.PersonRepository;
import com.pmd.project.model.Project;
import com.pmd.project.repository.ProjectCommentRepository;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.repository.WorkspaceRepository;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

/**
 * The public demo stays bounded: demo workspaces expire after a fixed lifetime and are
 * purged completely (including comments, people and their seed users), and accounts and
 * owned workspaces can be capped.
 */
@SpringBootTest
class DemoLimitsIntegrationTest {

    @Autowired private WorkspaceService workspaceService;
    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private WorkspaceRepository workspaceRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private ProjectCommentRepository projectCommentRepository;
    @Autowired private PersonRepository personRepository;
    @Autowired private MongoTemplate mongoTemplate;

    private User newAccount(String prefix) {
        User user = new User();
        user.setUsername(prefix + "-" + System.nanoTime() + "@example.com");
        user.setEmail(user.getUsername());
        user.setDisplayName(prefix);
        user.setPasswordHash("not-a-real-hash");
        return userRepository.save(user);
    }

    @Test
    void demoWorkspaceIsCreatedWithASevenDayExpiry() {
        User owner = newAccount("demo-expiry");
        Workspace workspace = workspaceService.getOrCreateDemoWorkspace(owner).workspace();

        assertThat(workspace.isDemo()).isTrue();
        assertThat(workspace.getDeletionScheduledAt()).isNotNull();
        assertThat(Duration.between(workspace.getCreatedAt(), workspace.getDeletionScheduledAt()))
            .isEqualTo(Duration.ofDays(7));
    }

    @Test
    void demoExpiryCannotBeCancelled() {
        User owner = newAccount("demo-cancel");
        String workspaceId = workspaceService.getOrCreateDemoWorkspace(owner).workspace().getId();

        assertThatThrownBy(() -> workspaceService.cancelWorkspaceDeletion(workspaceId, owner))
            .isInstanceOf(ResponseStatusException.class)
            .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST));
        assertThat(workspaceRepository.findById(workspaceId).orElseThrow().getDeletionScheduledAt()).isNotNull();
    }

    @Test
    void expiredDemoIsPurgedCompletelyAndCanBeCreatedAgain() {
        User owner = newAccount("demo-purge");
        Workspace workspace = workspaceService.getOrCreateDemoWorkspace(owner).workspace();
        String workspaceId = workspace.getId();
        List<String> projectIds = projectRepository.findByWorkspaceId(workspaceId, Sort.by("createdAt")).stream()
            .map(Project::getId)
            .toList();
        Query seedUsers = new Query(Criteria.where("email").regex("\\+" + workspaceId + "@pmd\\.local$"));
        // Sanity: the seeder ran, so the assertions below are not vacuous.
        assertThat(projectIds).isNotEmpty();
        assertThat(personRepository.findByWorkspaceId(workspaceId)).isNotEmpty();
        assertThat(mongoTemplate.count(seedUsers, User.class)).isPositive();

        workspace.setDeletionScheduledAt(Instant.now().minus(1, ChronoUnit.MINUTES));
        workspaceRepository.save(workspace);
        workspaceService.processScheduledWorkspaceDeletions();

        assertThat(workspaceRepository.findById(workspaceId)).isEmpty();
        assertThat(projectRepository.findByWorkspaceId(workspaceId, Sort.by("createdAt"))).isEmpty();
        assertThat(projectIds).allSatisfy(projectId ->
            assertThat(projectCommentRepository.findByProjectId(projectId, org.springframework.data.domain.Pageable.unpaged()))
                .isEmpty());
        assertThat(personRepository.findByWorkspaceId(workspaceId)).isEmpty();
        assertThat(mongoTemplate.count(seedUsers, User.class)).isZero();
        // The real account survives its demo.
        assertThat(userRepository.findById(owner.getId())).isPresent();

        Workspace fresh = workspaceService.getOrCreateDemoWorkspace(owner).workspace();
        assertThat(fresh.getId()).isNotEqualTo(workspaceId);
        assertThat(fresh.getDeletionScheduledAt()).isAfter(Instant.now().plus(6, ChronoUnit.DAYS));
    }

    @Test
    void ownedWorkspacesAreCappedButTheDemoDoesNotCount() {
        User owner = newAccount("ws-cap");
        workspaceService.getOrCreateDemoWorkspace(owner);
        ReflectionTestUtils.setField(workspaceService, "maxOwnedWorkspaces", 1);
        try {
            workspaceService.createWorkspace("Cap one " + System.nanoTime(), List.of(), owner);
            assertThatThrownBy(() -> workspaceService.createWorkspace("Cap two " + System.nanoTime(), List.of(), owner))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.CONFLICT));
        } finally {
            ReflectionTestUtils.setField(workspaceService, "maxOwnedWorkspaces", 0);
        }
    }

    @Test
    void accountCapIgnoresDemoSeedUsers() {
        long accounts = mongoTemplate.count(
            new Query(Criteria.where("email").not().regex("@pmd\\.local$")), User.class);
        try {
            ReflectionTestUtils.setField(userService, "maxAccounts", accounts + 1);
            userService.requireAccountCapacity();

            ReflectionTestUtils.setField(userService, "maxAccounts", accounts);
            assertThatThrownBy(userService::requireAccountCapacity)
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
        } finally {
            ReflectionTestUtils.setField(userService, "maxAccounts", 0L);
        }
    }
}
