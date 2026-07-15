package com.pmd.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import jakarta.servlet.Filter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

/**
 * The registration form has a required checkbox, but a form is not an access control — anything
 * can post to the endpoint. These tests are the actual gate, plus the record that makes an
 * acceptance provable afterwards rather than merely asserted.
 */
@SpringBootTest
class TermsAcceptanceIntegrationTest {

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private Filter springSecurityFilterChain;

    @Autowired
    private UserRepository userRepository;

    private MockMvc mockMvc;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext)
            .addFilters(springSecurityFilterChain)
            .build();
    }

    private String registrationJson(String email, boolean acceptedTerms) {
        return """
            {"email":"%s","password":"Str0ng-Passw0rd!x","confirmPassword":"Str0ng-Passw0rd!x",
             "firstName":"Terms","lastName":"Tester","acceptedTerms":%s}
            """.formatted(email, acceptedTerms);
    }

    @Test
    void refusesRegistrationThatDoesNotAcceptTheTerms() throws Exception {
        String email = "no-accept-" + System.nanoTime() + "@pmd.local";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registrationJson(email, false)))
            .andExpect(status().isBadRequest());

        assertThat(userRepository.findByUsername(email)).isEmpty();
    }

    @Test
    void refusesRegistrationThatOmitsTheFieldEntirely() throws Exception {
        // A client that simply leaves the field out must not default into acceptance.
        String email = "omitted-" + System.nanoTime() + "@pmd.local";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"%s","password":"Str0ng-Passw0rd!x","confirmPassword":"Str0ng-Passw0rd!x",
                     "firstName":"Terms","lastName":"Tester"}
                    """.formatted(email)))
            .andExpect(status().isBadRequest());

        assertThat(userRepository.findByUsername(email)).isEmpty();
    }

    @Test
    void recordsWhatWasAcceptedAndWhen() throws Exception {
        String email = "accepted-" + System.nanoTime() + "@pmd.local";

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registrationJson(email, true)))
            .andExpect(status().isOk());

        // "They accepted" is not much use without being able to say when, and to what.
        User created = userRepository.findByUsername(email).orElseThrow();
        assertThat(created.getTermsAcceptedAt()).isNotNull();
        assertThat(created.getTermsVersion()).isNotBlank();
    }
}
