package com.pmd.team;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pmd.auth.security.JwtService;
import com.pmd.team.repository.TeamRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import java.util.List;
import java.util.Map;
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

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private WebApplicationContext webApplicationContext;

    private String adminToken;
    private String userToken;
    private String adminUserId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build();
        userRepository.deleteAll();
        String teamId = teamRepository.findAll().stream()
            .findFirst()
            .map(team -> team.getId())
            .orElse(null);

        User admin = new User();
        admin.setUsername("admin@test.local");
        admin.setEmail("admin@test.local");
        admin.setDisplayName("Admin");
        admin.setAdmin(true);
        admin.setTeamId(teamId);
        admin.setTeam("Admin");
        admin = userRepository.save(admin);
        adminUserId = admin.getId();

        User user = new User();
        user.setUsername("user@test.local");
        user.setEmail("user@test.local");
        user.setDisplayName("User");
        user.setAdmin(false);
        user.setTeamId(teamId);
        user.setTeam("Web Development");
        user = userRepository.save(user);

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
        var response = mockMvc.perform(get("/api/teams"))
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
        mockMvc.perform(post("/api/teams")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Platform Engineering\"}"))
            .andExpect(status().isCreated());

        var response = mockMvc.perform(get("/api/teams"))
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
        mockMvc.perform(post("/api/teams")
                .header("Authorization", "Bearer " + userToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Growth\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @Order(4)
    void nonAdminCannotSeeAdminUsers() throws Exception {
        var response = mockMvc.perform(get("/api/users")
                .header("Authorization", "Bearer " + userToken))
            .andExpect(status().isOk())
            .andReturn()
            .getResponse()
            .getContentAsString();
        List<Map<String, Object>> users = objectMapper.readValue(response, new TypeReference<>() {});
        assertThat(users.stream().noneMatch(user -> adminUserId.equals(user.get("id")))).isTrue();
    }
}
