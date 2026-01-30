package com.pmd.team;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.Filter;
import com.pmd.auth.security.JwtService;
import com.pmd.team.repository.TeamRepository;
import com.pmd.team.model.Team;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class TeamIntegrationTest {

    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private Filter springSecurityFilterChain;

    @Autowired
    private WebApplicationContext webApplicationContext;

    private String adminToken;
    private String userToken;
    private String adminUserId;
    private String workspaceId;

    private static final List<String> DEFAULT_TEAMS = List.of(
        "Web Development",
        "Software Engineering",
        "Network Engineering",
        "Cybersecurity",
        "DevOps",
        "QA / Testing",
        "Data Engineering",
        "Project Management",
        "UX / UI Design",
        "IT Support / Helpdesk"
    );

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
            .addFilters(springSecurityFilterChain)
            .build();
        userRepository.deleteAll();
        workspaceMemberRepository.deleteAll();
        workspaceRepository.deleteAll();
        teamRepository.deleteAll();

        User admin = new User();
        admin.setUsername("admin@test.local");
        admin.setEmail("admin@test.local");
        admin.setDisplayName("Admin");
        admin.setAdmin(true);
        admin = userRepository.save(admin);
        adminUserId = admin.getId();

        User user = new User();
        user.setUsername("user@test.local");
        user.setEmail("user@test.local");
        user.setDisplayName("User");
        user.setAdmin(false);
        user = userRepository.save(user);

        Workspace workspace = new Workspace();
        workspace.setName("Test Workspace");
        workspace.setSlug("test-workspace");
        workspace.setCreatedAt(Instant.now());
        workspace.setCreatedByUserId(adminUserId);
        workspace.setDemo(false);
        workspace.setRequireApproval(false);
        workspace = workspaceRepository.save(workspace);
        workspaceId = workspace.getId();

        WorkspaceMember adminMember = new WorkspaceMember();
        adminMember.setWorkspaceId(workspaceId);
        adminMember.setUserId(adminUserId);
        adminMember.setRole(WorkspaceMemberRole.OWNER);
        adminMember.setStatus(WorkspaceMemberStatus.ACTIVE);
        adminMember.setCreatedAt(Instant.now());
        adminMember.setJoinedAt(Instant.now());
        workspaceMemberRepository.save(adminMember);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(workspaceId);
        member.setUserId(user.getId());
        member.setRole(WorkspaceMemberRole.MEMBER);
        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        member.setCreatedAt(Instant.now());
        member.setJoinedAt(Instant.now());
        workspaceMemberRepository.save(member);

        List<Team> teams = DEFAULT_TEAMS.stream().map(name -> {
            Team team = new Team();
            team.setName(name);
            team.setSlug(slugify(name));
            team.setWorkspaceId(workspaceId);
            team.setActive(true);
            team.setCreatedAt(Instant.now());
            team.setCreatedBy(adminUserId);
            return team;
        }).collect(Collectors.toList());
        List<Team> savedTeams = teamRepository.saveAll(teams);
        String teamId = savedTeams.isEmpty() ? null : savedTeams.get(0).getId();
        String teamName = savedTeams.isEmpty() ? null : savedTeams.get(0).getName();
        admin.setTeamId(teamId);
        admin.setTeam(teamName);
        user.setTeamId(teamId);
        user.setTeam(teamName);
        userRepository.save(admin);
        userRepository.save(user);

        adminToken = jwtService.generateToken(
            admin.getId(),
            Map.of("username", admin.getUsername(), "displayName", admin.getDisplayName())
        );
        userToken = jwtService.generateToken(
            user.getId(),
            Map.of("username", user.getUsername(), "displayName", user.getDisplayName())
        );
    }

    @Test
    @Order(1)
    void getTeamsReturnsSeededDefaults() throws Exception {
        var response = mockMvc.perform(get("/api/workspaces/" + workspaceId + "/teams")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        List<Map<String, Object>> teams = objectMapper.readValue(response, new TypeReference<>() {});
        assertThat(teams).hasSize(10);
    }

    @Test
    @Order(2)
    void adminCanCreateTeam() throws Exception {
        mockMvc.perform(post("/api/workspaces/" + workspaceId + "/teams")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Platform Engineering\"}"))
            .andExpect(status().isCreated());

        var response = mockMvc.perform(get("/api/workspaces/" + workspaceId + "/teams")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        List<Map<String, Object>> teams = objectMapper.readValue(response, new TypeReference<>() {});
        assertThat(teams.stream().anyMatch(team -> "Platform Engineering".equals(team.get("name")))).isTrue();
    }

    @Test
    @Order(3)
    void nonAdminCannotCreateTeam() throws Exception {
        mockMvc.perform(post("/api/workspaces/" + workspaceId + "/teams")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Growth\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @Order(4)
    void nonAdminCannotSeeAdminUsers() throws Exception {
        var response = mockMvc.perform(get("/api/workspaces/" + workspaceId + "/users")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        List<Map<String, Object>> users = objectMapper.readValue(response, new TypeReference<>() {});
        assertThat(users.stream().noneMatch(user -> adminUserId.equals(user.get("id")))).isTrue();
    }

    private static String slugify(String name) {
        if (name == null) {
            return "";
        }
        String slug = name.trim().toLowerCase();
        slug = slug.replaceAll("[^a-z0-9]+", "-");
        return slug.replaceAll("(^-|-$)", "");
    }
}
