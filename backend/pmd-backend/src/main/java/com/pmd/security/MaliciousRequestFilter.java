package com.pmd.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class MaliciousRequestFilter extends OncePerRequestFilter {

    private static final Logger securityLogger = LoggerFactory.getLogger("SECURITY");

    private static final List<Pattern> ATTACK_PATTERNS = List.of(
        Pattern.compile("#set\\s*\\(", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\$\\{[^}]+\\}", Pattern.CASE_INSENSITIVE),
        Pattern.compile("<xsl:", Pattern.CASE_INSENSITIVE),
        Pattern.compile("xmlns:xsl", Pattern.CASE_INSENSITIVE),
        Pattern.compile("java\\.lang\\.Runtime", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\.forName\\(", Pattern.CASE_INSENSITIVE),
        Pattern.compile("class\\.module\\.classLoader", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\.\\./"),
        Pattern.compile("%2e%2e%2f", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\.htaccess", Pattern.CASE_INSENSITIVE),
        Pattern.compile("\\.env", Pattern.CASE_INSENSITIVE)
    );

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path == null
            || (!path.startsWith("/api") && !path.startsWith("/actuator"))
            || path.startsWith("/actuator/health");
    }

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String uri = request.getRequestURI();
        String query = request.getQueryString();
        String userAgent = request.getHeader("User-Agent");
        String clientIp = getClientIp(request);

        if (containsMaliciousPattern(uri)) {
            block(response, clientIp, uri, "URI_ATTACK", userAgent);
            return;
        }
        if (containsMaliciousPattern(query)) {
            block(response, clientIp, uri + "?" + query, "QUERY_ATTACK", userAgent);
            return;
        }
        if (containsMaliciousPattern(userAgent)) {
            block(response, clientIp, uri, "HEADER_ATTACK", userAgent);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void block(HttpServletResponse response, String ip, String target, String attackType, String userAgent)
        throws IOException {
        securityLogger.warn(
            "ATTACK_BLOCKED | ip={} | target={} | type={} | userAgent={} | timestamp={}",
            ip,
            target,
            attackType,
            userAgent,
            Instant.now()
        );
        response.sendError(HttpServletResponse.SC_FORBIDDEN, "Malicious request pattern detected");
    }

    private boolean containsMaliciousPattern(String input) {
        if (input == null || input.isBlank()) {
            return false;
        }
        String decoded = decode(input);
        for (Pattern pattern : ATTACK_PATTERNS) {
            if (pattern.matcher(decoded).find()) {
                return true;
            }
        }
        return false;
    }

    private String decode(String value) {
        try {
            return URLDecoder.decode(value, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ex) {
            return value;
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp;
        }
        return request.getRemoteAddr();
    }
}
