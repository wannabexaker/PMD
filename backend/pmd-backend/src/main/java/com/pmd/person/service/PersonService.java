package com.pmd.person.service;

import com.pmd.person.dto.PersonRequest;
import com.pmd.person.dto.PersonResponse;
import com.pmd.person.model.Person;
import com.pmd.person.repository.PersonRepository;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PersonService {

    private final PersonRepository personRepository;

    public PersonService(PersonRepository personRepository) {
        this.personRepository = personRepository;
    }

    public PersonResponse create(PersonRequest request) {
        Person person = new Person();
        person.setDisplayName(request.getDisplayName());
        person.setEmail(request.getEmail());
        person.setCreatedAt(Instant.now());

        Person saved = personRepository.save(person);
        return toResponse(saved);
    }

    public List<PersonResponse> findAll() {
        return personRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
    }

    public PersonResponse findById(String id) {
        Person person = personRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Person not found"));
        return toResponse(person);
    }

    private PersonResponse toResponse(Person person) {
        return new PersonResponse(
            person.getId(),
            person.getDisplayName(),
            person.getEmail(),
            person.getCreatedAt()
        );
    }
}