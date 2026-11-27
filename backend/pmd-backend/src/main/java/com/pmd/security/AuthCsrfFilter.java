package com.pmd.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthCsrfFilter extends OncePerRequestFilter {

    private static final Set<String> PROTECTED_PATHS = Set.of(
        "/api/auth/refresh",
        "/api/auth/logout",
        "/api/auth/logout-all"
    );

    // Provider, not the bean itself: the CORS source is defined by SecurityConfig, which in
    // turn depends on this filter.
    private final ObjectProvider<CorsConfigurationSource> corsConfigurationSource;

    public AuthCsrfFilter(@Qualifier("corsConfigurationSource") ObjectProvider<CorsConfigurationSource> corsConfigurationSource) {
        this.corsConfigurationSource = corsConfigurationSource;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!HttpMethod.POST.matches(request.getMethod())) {
            return true;
        }
        return !PROTECTED_PATHS.contains(request.getRequestURI());
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        // The double-submit cookie may live on the parent domain, where a sibling subdomain can
        // also write it. A browser always sends Origin on these POSTs, so additionally refuse any
        // origin the CORS policy does not allow.
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin != null && !isAllowedOrigin(request, origin)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Origin not allowed");
            return;
        }
        String csrfCookie = null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("PMD_CSRF".equals(cookie.getName())) {
                    csrfCookie = cookie.getValue();
                    break;
                }
            }
        }
        String csrfHeader = request.getHeader("X-PMD-CSRF");
        if (csrfCookie == null || csrfCookie.isBlank() || csrfHeader == null || !csrfCookie.equals(csrfHeader)) {
            response.sendError(HttpServletResponse.SC_FORBIDDEN, "Invalid CSRF token");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isAllowedOrigin(HttpServletRequest request, String origin) {
        CorsConfigurationSource source = corsConfigurationSource.getIfAvailable();
        if (source == null) {
            return false;
        }
        CorsConfiguration configuration = source.getCorsConfiguration(request);
        return configuration != null && configuration.checkOrigin(origin) != null;
    }
}
