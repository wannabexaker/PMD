package com.pmd.project.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.eq;

import com.mongodb.client.MongoDatabase;
import com.pmd.auth.policy.AccessPolicy;
import com.pmd.project.dto.RandomAssignResponse;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.service.TeamService;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;

class ProjectServiceTest {

    private ProjectRepository projectRepository;
    private UserRepository userRepository;
    private UserService userService;
    private ApplicationEventPublisher eventPublisher;
    private AccessPolicy accessPolicy;
    private MongoTemplate mongoTemplate;
    private ProjectService projectService;
    private TeamService teamService;

    @BeforeEach
    void setUp() {
        projectRepository = mock(ProjectRepository.class);
        userRepository = mock(UserRepository.class);
        userService = mock(UserService.class);
        eventPublisher = mock(ApplicationEventPublisher.class);
        accessPolicy = mock(AccessPolicy.class);
        mongoTemplate = mock(MongoTemplate.class);
        teamService = mock(TeamService.class);

        MongoDatabase mongoDatabase = mock(MongoDatabase.class);
        when(mongoTemplate.getDb()).thenReturn(mongoDatabase);
        when(mongoDatabase.getName()).thenReturn("pmd-test");
        when(mongoTemplate.getCollectionName(Project.class)).thenReturn("projects");

        projectService = new ProjectService(
            projectRepository,
            userRepository,
            userService,
            eventPublisher,
            accessPolicy,
            mongoTemplate,
            teamService
        );
    }

    @Test
    void findAllAssignedToMeFiltersByMemberId() {
        String workspaceId = "workspace-1";
        User requester = new User();
        requester.setId("user-1");
        requester.setTeam("dev");

        Project mine = new Project();
        mine.setId("project-1");
        mine.setWorkspaceId(workspaceId);
        mine.setStatus(ProjectStatus.NOT_STARTED);
        mine.setMemberIds(List.of("user-1"));

        Project other = new Project();
        other.setId("project-2");
        other.setWorkspaceId(workspaceId);
        other.setStatus(ProjectStatus.NOT_STARTED);
        other.setMemberIds(List.of("user-2"));

        when(accessPolicy.isAdmin(requester)).thenReturn(false);
        when(projectRepository.findByWorkspaceId(eq(workspaceId), any(Sort.class))).thenReturn(List.of(mine, other));
        when(userRepository.findById(anyString())).thenReturn(Optional.empty());

        var results = projectService.findAll(workspaceId, requester, true);

        assertEquals(1, results.size());
        assertEquals("project-1", results.get(0).getId());
    }

    @Test
    void randomAssignPicksLowestActiveCountAndAssignsExactlyOne() {
        String workspaceId = "workspace-1";
        User requester = new User();
        requester.setId("user-req");
        requester.setTeam("dev");

        Project project = new Project();
        project.setId("project-1");
        project.setWorkspaceId(workspaceId);
        project.setName("Project 1");
        project.setStatus(ProjectStatus.NOT_STARTED);
        project.setMemberIds(new ArrayList<>());

        User lowest = new User();
        lowest.setId("user-low");
        lowest.setDisplayName("Low");
        lowest.setEmail("low@example.com");
        lowest.setTeam("dev");

        User higher = new User();
        higher.setId("user-high");
        higher.setDisplayName("High");
        higher.setEmail("high@example.com");
        higher.setTeam("dev");

        when(accessPolicy.isAdmin(requester)).thenReturn(false);
        doNothing().when(accessPolicy).assertCanViewProject(requester, project);
        doNothing().when(accessPolicy).assertCanAssignUserToProject(any(User.class), any(User.class), any(Project.class));
        when(projectRepository.findByIdAndWorkspaceId("project-1", workspaceId)).thenReturn(Optional.of(project));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(userService.findAssignableUsers(eq(workspaceId), eq(null), eq(null), eq(false)))
            .thenReturn(List.of(lowest, higher));
        when(userService.findActiveProjectCounts(eq(workspaceId), anyList(), eq(false)))
            .thenReturn(Map.of("user-low", 0L, "user-high", 2L));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(lowest));
        when(userRepository.findById(anyString())).thenReturn(Optional.empty());

        RandomAssignResponse response = projectService.randomAssign(workspaceId, "project-1", requester, null);

        assertEquals("user-low", response.getAssignedPerson().getId());
        assertTrue(response.getProject().getMemberIds().contains("user-low"));
        assertEquals(1, response.getProject().getMemberIds().size());
    }
}
