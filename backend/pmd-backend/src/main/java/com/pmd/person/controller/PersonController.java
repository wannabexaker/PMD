package com.pmd.person.controller;

import com.pmd.person.dto.PersonRequest;
import com.pmd.person.dto.PersonResponse;
import com.pmd.person.service.PersonService;
import com.pmd.auth.policy.AccessPolicy;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/people")
public class PersonController {

    private final PersonService personService;
    private final UserService userService;
    private final AccessPolicy accessPolicy;

    public PersonController(PersonService personService, UserService userService, AccessPolicy accessPolicy) {
        this.personService = personService;
        this.userService = userService;
        this.accessPolicy = accessPolicy;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PersonResponse create(@Valid @RequestBody PersonRequest request, Authentication authentication) {
        User requester = getRequester(authentication);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return personService.create(request);
    }

    @GetMapping
    public List<PersonResponse> findAll(Authentication authentication) {
        getRequester(authentication);
        return personService.findAll();
    }

    @GetMapping("/{id}")
    public PersonResponse findById(@PathVariable String id, Authentication authentication) {
        getRequester(authentication);
        return personService.findById(id);
    }

    @PutMapping("/{id}")
    public PersonResponse update(@PathVariable String id,
                                 @Valid @RequestBody PersonRequest request,
                                 Authentication authentication) {
        User requester = getRequester(authentication);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return personService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        personService.delete(id);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
