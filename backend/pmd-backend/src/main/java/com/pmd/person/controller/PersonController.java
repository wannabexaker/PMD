package com.pmd.person.controller;

import com.pmd.person.dto.PersonRequest;
import com.pmd.person.dto.PersonResponse;
import com.pmd.person.service.PersonService;
import com.pmd.auth.policy.AccessPolicy;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.service.WorkspaceService;
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
@RequestMapping("/api/workspaces/{workspaceId}/people")
public class PersonController {

    private final PersonService personService;
    private final UserService userService;
    private final AccessPolicy accessPolicy;
    private final WorkspaceService workspaceService;

    public PersonController(PersonService personService, UserService userService, AccessPolicy accessPolicy,
                            WorkspaceService workspaceService) {
        this.personService = personService;
        this.userService = userService;
        this.accessPolicy = accessPolicy;
        this.workspaceService = workspaceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PersonResponse create(@PathVariable String workspaceId,
                                 @Valid @RequestBody PersonRequest request,
                                 Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return personService.create(workspaceId, request);
    }

    @GetMapping
    public List<PersonResponse> findAll(@PathVariable String workspaceId, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return personService.findAll(workspaceId);
    }

    @GetMapping("/{id}")
    public PersonResponse findById(@PathVariable String workspaceId, @PathVariable String id,
                                   Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return personService.findById(workspaceId, id);
    }

    @PutMapping("/{id}")
    public PersonResponse update(@PathVariable String workspaceId,
                                 @PathVariable String id,
                                 @Valid @RequestBody PersonRequest request,
                                 Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        return personService.update(workspaceId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String workspaceId, @PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        if (!accessPolicy.isAdmin(requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
        personService.delete(workspaceId, id);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
