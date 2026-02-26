package com.pmd.auth.service;

import com.pmd.auth.model.AuthSecurityEvent;
import com.pmd.auth.repository.AuthSecurityEventRepository;
import com.pmd.security.ClientMetadataService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class AuthSecurityEventService {

    private final AuthSecurityEventRepository repository;
    private final ClientMetadataService clientMetadataService;

    public AuthSecurityEventService(AuthSecurityEventRepository repository,
                                    ClientMetadataService clientMetadataService) {
        this.repository = repository;
        this.clientMetadataService = clientMetadataService;
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
            String rawIp = clientMetadataService.resolveClientIp(request);
            String ua = request.getHeader("User-Agent");
            event.setIpAddress(clientMetadataService.sanitizeIpForStorage(rawIp));
            event.setUserAgent(clientMetadataService.sanitizeUserAgentForStorage(ua));
        }
        repository.save(event);
    }
}
