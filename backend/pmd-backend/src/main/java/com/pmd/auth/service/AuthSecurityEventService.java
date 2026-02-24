package com.pmd.auth.service;

import com.pmd.auth.model.AuthSecurityEvent;
import com.pmd.auth.repository.AuthSecurityEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class AuthSecurityEventService {

    private final AuthSecurityEventRepository repository;

    public AuthSecurityEventService(AuthSecurityEventRepository repository) {
        this.repository = repository;
    }

    public void log(String eventType, String outcome, String userId, String username, String message, HttpServletRequest request) {
        AuthSecurityEvent event = new AuthSecurityEvent();
        event.setCreatedAt(Instant.now());
        event.setEventType(eventType);
        event.setOutcome(outcome);
        event.setUserId(userId);
        event.setUsername(username);
        event.setMessage(message);
        if (request != null) {
            event.setIpAddress(extractClientIp(request));
            String ua = request.getHeader("User-Agent");
            event.setUserAgent(ua == null ? null : ua.substring(0, Math.min(ua.length(), 300)));
        }
        repository.save(event);
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
