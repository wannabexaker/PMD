package com.pmd.config.migration;

import org.springframework.data.mongodb.repository.MongoRepository;

public interface MigrationStateRepository extends MongoRepository<MigrationState, String> {
}
