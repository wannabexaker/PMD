package com.pmd.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pmd.auth.security.JwtService;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import jakarta.servlet.Filter;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * Security-config integration tests. Confirms the SecurityConfig rules:
 * {@code /api/**} requires authentication, a valid JWT is accepted, and
 * {@code /uploads/**}, the login endpoint and {@code /actuator/health} stay
 * public under the default-deny ({@code anyRequest().denyAll()}) policy.
 *
 * Public routes are asserted as "not auth-blocked" (never 401/403) rather than
 * a specific status, so the checks stay robust regardless of downstream state
 * (e.g. mail health, missing upload file).
 */
@SpringBootTest
class SecurityIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private Filter springSecurityFilterChain;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtService jwtService;

    private MockMvc mockMvc;
    private String userToken;

    /** Passes when the response was not rejected by authentication/authorization. */
    private static ResultMatcher isNotAuthBlocked() {
        return result -> assertThat(result.getResponse().getStatus()).isNotIn(401, 403);
    }

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
            .addFilters(springSecurityFilterChain)
            .build();

        userRepository.deleteAll();
        User user = new User();
        user.setUsername("sec-test@pmd.local");
        user.setEmail("sec-test@pmd.local");
        user.setDisplayName("Sec Test");
        user = userRepository.save(user);
        userToken = jwtService.generateToken(
            user.getId(),
            Map.of("username", user.getUsername(), "displayName", user.getDisplayName()));
    }

    @Test
    void protectedApiRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
            .andExpect(status().is4xxClientError());
    }

    @Test
    void validTokenIsAccepted() throws Exception {
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + userToken))
            .andExpect(status().isOk());
    }

    @Test
    void loginEndpointIsPublic() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(isNotAuthBlocked());
    }

    @Test
    void uploadsPathIsPublic() throws Exception {
        mockMvc.perform(get("/uploads/does-not-exist.png"))
            .andExpect(isNotAuthBlocked());
    }

    @Test
    void actuatorHealthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
            .andExpect(isNotAuthBlocked());
    }

    @Test
    void malformedJsonBodyReturns400NotServerError() throws Exception {
        // HttpMessageNotReadableException (also thrown for invalid enum values)
        // must map to 400, not fall through to the catch-all 500.
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{ this is not valid json"))
            .andExpect(status().isBadRequest());
    }

    @Test
    void unsupportedHttpMethodReturns405NotServerError() throws Exception {
        // /api/auth/me has no DELETE handler -> 405, not 500.
        mockMvc.perform(delete("/api/auth/me").header("Authorization", "Bearer " + userToken))
            .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void userResponseSerializesAdminFlagAsIsAdmin() throws Exception {
        // The frontend reads user.isAdmin; the boolean getter would otherwise
        // serialize as "admin" (Jackson default) and break admin nav/routing.
        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + userToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.isAdmin").exists())
            .andExpect(jsonPath("$.admin").doesNotExist());
    }
}
