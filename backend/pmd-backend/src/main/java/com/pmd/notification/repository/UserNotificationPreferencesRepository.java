package com.pmd.notification.repository;

import com.pmd.notification.model.UserNotificationPreferences;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UserNotificationPreferencesRepository extends MongoRepository<UserNotificationPreferences, String> {
    Optional<UserNotificationPreferences> findByUserId(String userId);
}
