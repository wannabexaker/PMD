package com.pmd.person.repository;

import com.pmd.person.model.Person;
import java.util.List;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface PersonRepository extends MongoRepository<Person, String> {
    List<Person> findByWorkspaceId(String workspaceId);

    Optional<Person> findByIdAndWorkspaceId(String id, String workspaceId);

    Optional<Person> findByWorkspaceIdAndEmail(String workspaceId, String email);
}
