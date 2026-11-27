package com.pmd.security;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.servlet.http.Cookie;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/** The refresh/logout double-submit check also refuses origins outside the CORS policy. */
class AuthCsrfFilterOriginTest {

    private AuthCsrfFilter filter() {
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(List.of("https://pmd.example.com"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cors);
        StaticListableBeanFactory factory = new StaticListableBeanFactory();
        factory.addBean("corsConfigurationSource", source);
        return new AuthCsrfFilter(factory.getBeanProvider(CorsConfigurationSource.class));
    }

    private MockHttpServletRequest refresh(String origin) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        request.setCookies(new Cookie("PMD_CSRF", "t"));
        request.addHeader("X-PMD-CSRF", "t");
        if (origin != null) {
            request.addHeader("Origin", origin);
        }
        return request;
    }

    private int run(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter().doFilter(request, response, new MockFilterChain());
        return response.getStatus();
    }

    @Test
    void allowsTheSpaOrigin() throws Exception {
        assertThat(run(refresh("https://pmd.example.com"))).isEqualTo(200);
    }

    @Test
    void refusesASiblingOriginEvenWithAMatchingToken() throws Exception {
        assertThat(run(refresh("https://other.example.com"))).isEqualTo(403);
    }

    @Test
    void stillRequiresTheTokenWithoutAnOrigin() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/refresh");
        assertThat(run(request)).isEqualTo(403);
        assertThat(run(refresh(null))).isEqualTo(200);
    }
}
