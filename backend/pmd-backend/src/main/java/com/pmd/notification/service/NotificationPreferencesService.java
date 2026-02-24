package com.pmd.notification.service;

import com.pmd.notification.dto.NotificationPreferencesRequest;
import com.pmd.notification.dto.NotificationPreferencesResponse;
import com.pmd.notification.model.UserNotificationPreferences;
import com.pmd.notification.repository.UserNotificationPreferencesRepository;
import java.time.Instant;
import org.springframework.stereotype.Service;

@Service
public class NotificationPreferencesService {

    private final UserNotificationPreferencesRepository repository;

    public NotificationPreferencesService(UserNotificationPreferencesRepository repository) {
        this.repository = repository;
    }

    public NotificationPreferencesResponse getPreferences(String userId) {
        if (userId == null || userId.isBlank()) {
            return NotificationPreferencesResponse.defaults();
        }
        return repository.findByUserId(userId)
            .map(NotificationPreferencesResponse::new)
            .orElseGet(NotificationPreferencesResponse::defaults);
    }

    public UserNotificationPreferences resolvePreferences(String userId) {
        if (userId == null || userId.isBlank()) {
            UserNotificationPreferences prefs = new UserNotificationPreferences();
            prefs.setUserId(null);
            return prefs;
        }
        return repository.findByUserId(userId)
            .orElseGet(() -> {
                UserNotificationPreferences prefs = new UserNotificationPreferences();
                prefs.setUserId(userId);
                return prefs;
            });
    }

    public NotificationPreferencesResponse savePreferences(String userId, NotificationPreferencesRequest request) {
        UserNotificationPreferences prefs = resolvePreferences(userId);
        prefs.setUserId(userId);
        prefs.setEmailOnAssign(resolve(request.getEmailOnAssign()));
        prefs.setEmailOnMentionUser(resolve(request.getEmailOnMentionUser()));
        prefs.setEmailOnMentionTeam(resolve(request.getEmailOnMentionTeam()));
        prefs.setEmailOnMentionComment(resolve(request.getEmailOnMentionComment()));
        prefs.setEmailOnMentionDescription(resolve(request.getEmailOnMentionDescription()));
        prefs.setEmailOnMentionProjectTitle(resolve(request.getEmailOnMentionProjectTitle()));
        prefs.setEmailOnProjectStatusChange(resolve(request.getEmailOnProjectStatusChange()));
        prefs.setEmailOnProjectMembershipChange(resolve(request.getEmailOnProjectMembershipChange()));
        prefs.setEmailOnOverdueReminder(resolve(request.getEmailOnOverdueReminder()));
        prefs.setUpdatedAt(Instant.now());
        UserNotificationPreferences saved = repository.save(prefs);
        return new NotificationPreferencesResponse(saved);
    }

    private boolean resolve(Boolean value) {
        return value == null || value;
    }
}
