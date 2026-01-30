package com.pmd.notification.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.notification.dto.NotificationPreferencesRequest;
import com.pmd.notification.dto.NotificationPreferencesResponse;
import com.pmd.notification.service.NotificationPreferencesService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/notifications")
public class NotificationPreferencesController {

    private final NotificationPreferencesService preferencesService;

    public NotificationPreferencesController(NotificationPreferencesService preferencesService) {
        this.preferencesService = preferencesService;
    }

    @GetMapping("/preferences")
    public NotificationPreferencesResponse getPreferences(Authentication authentication) {
        String userId = resolveUserId(authentication);
        return preferencesService.getPreferences(userId);
    }

    @PutMapping("/preferences")
    @ResponseStatus(HttpStatus.OK)
    public NotificationPreferencesResponse updatePreferences(@Valid @RequestBody NotificationPreferencesRequest request,
                                                            Authentication authentication) {
        String userId = resolveUserId(authentication);
        return preferencesService.savePreferences(userId, request);
    }

    private String resolveUserId(Authentication authentication) {
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return principal.getId();
    }
}
