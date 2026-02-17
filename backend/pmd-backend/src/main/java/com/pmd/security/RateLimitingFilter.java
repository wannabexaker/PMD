package com.pmd.security;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingFilter.class);

    private final int maxRequestsPerMinute;
    private final int maxRequestsPerHour;
    private final LoadingCache<String, AtomicInteger> minuteRequestCounts;
    private final LoadingCache<String, AtomicInteger> hourRequestCounts;

    public RateLimitingFilter(
        @Value("${pmd.security.rate-limit.per-minute:180}") int maxRequestsPerMinute,
        @Value("${pmd.security.rate-limit.per-hour:3000}") int maxRequestsPerHour
    ) {
        this.maxRequestsPerMinute = maxRequestsPerMinute;
        this.maxRequestsPerHour = maxRequestsPerHour;
        this.minuteRequestCounts = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.MINUTES)
            .build(new CacheLoader<>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });
        this.hourRequestCounts = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS)
            .build(new CacheLoader<>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }
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
        String rateLimitKey = getRateLimitKey(request);
        try {
            int minuteCount = minuteRequestCounts.get(rateLimitKey).incrementAndGet();
            int hourCount = hourRequestCounts.get(rateLimitKey).incrementAndGet();

            if (minuteCount > maxRequestsPerMinute) {
                response.setHeader("Retry-After", "60");
                response.sendError(429, "Too many requests");
                return;
            }
            if (hourCount > maxRequestsPerHour) {
                response.setHeader("Retry-After", "3600");
                response.sendError(429, "Too many requests");
                return;
            }

            response.setHeader("X-RateLimit-Limit-Minute", String.valueOf(maxRequestsPerMinute));
            response.setHeader("X-RateLimit-Remaining-Minute", String.valueOf(Math.max(0, maxRequestsPerMinute - minuteCount)));
        } catch (ExecutionException ex) {
            logger.warn("Rate limiter cache failure for key {}", rateLimitKey, ex);
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getRateLimitKey(HttpServletRequest request) {
        String clientIp = getClientIp(request);
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            String principal = authentication.getName();
            if (principal != null && !principal.isBlank() && !"anonymousUser".equalsIgnoreCase(principal)) {
                return clientIp + "|" + principal;
            }
        }
        return clientIp + "|anonymous";
    }
}
