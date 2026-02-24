package com.pmd.auth.repository;

import com.pmd.auth.model.AuthSecurityEvent;
import java.time.Instant;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface AuthSecurityEventRepository extends MongoRepository<AuthSecurityEvent, String> {
    void deleteByCreatedAtBefore(Instant cutoff);
}
