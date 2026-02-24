package com.pmd.auth.repository;

import com.pmd.auth.model.AuthSession;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuthSessionRepository extends MongoRepository<AuthSession, String> {

    Optional<AuthSession> findByTokenHash(String tokenHash);

    List<AuthSession> findByUserIdAndRevokedAtIsNull(String userId);

    void deleteByExpiresAtBefore(Instant cutoff);

    void deleteByRevokedAtBeforeAndRevokedAtIsNotNull(Instant cutoff);
}
