package com.pmd.project.controller;

import com.pmd.project.dto.ProjectRequest;
import com.pmd.project.dto.ProjectResponse;
import com.pmd.project.service.ProjectService;
import com.pmd.project.dto.DashboardStatsResponse;
import com.pmd.project.dto.RandomAssignRequest;
import com.pmd.project.dto.RandomAssignResponse;
import com.pmd.project.dto.RandomProjectRequest;
import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;

    public ProjectController(ProjectService projectService, UserService userService) {
        this.projectService = projectService;
        this.userService = userService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@Valid @RequestBody ProjectRequest request, Authentication authentication) {
        User requester = getRequester(authentication);
        return projectService.create(request, requester);
    }

    @GetMapping
    public List<ProjectResponse> findAll(
        @RequestParam(name = "assignedToMe", defaultValue = "false") boolean assignedToMe,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        return projectService.findAll(requester, assignedToMe);
    }

    @GetMapping("/my-stats")
    public DashboardStatsResponse myStats(Authentication authentication) {
        User requester = getRequester(authentication);
        return projectService.getMyDashboardStats(requester);
    }

    @PostMapping("/random")
    public ProjectResponse randomProject(
        @RequestBody(required = false) RandomProjectRequest request,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        String teamId = request != null ? request.getTeamId() : null;
        return projectService.randomProject(requester, teamId);
    }

    @GetMapping("/{id}")
    public ProjectResponse findById(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        return projectService.findById(id, requester);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable String id, @Valid @RequestBody ProjectRequest request,
                                  Authentication authentication) {
        User requester = getRequester(authentication);
        String assignedByUserId = requester.getId();
        return projectService.update(id, request, assignedByUserId, requester);
    }

    @PostMapping("/{id}/random-assign")
    public RandomAssignResponse randomAssign(
        @PathVariable String id,
        @RequestBody(required = false) RandomAssignRequest request,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        String teamId = request != null ? request.getTeamId() : null;
        return projectService.randomAssign(id, requester, teamId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        projectService.delete(id, requester);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
