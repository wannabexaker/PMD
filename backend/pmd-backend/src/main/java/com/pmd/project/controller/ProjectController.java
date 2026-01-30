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
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.service.WorkspaceService;
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
@RequestMapping("/api/workspaces/{workspaceId}/projects")
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;
    private final WorkspaceService workspaceService;

    public ProjectController(ProjectService projectService, UserService userService,
                             WorkspaceService workspaceService) {
        this.projectService = projectService;
        this.userService = userService;
        this.workspaceService = workspaceService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProjectResponse create(@PathVariable String workspaceId,
                                  @Valid @RequestBody ProjectRequest request,
                                  Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.CREATE_PROJECT);
        if (request.getMemberIds() != null && !request.getMemberIds().isEmpty()) {
            workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.ASSIGN_PEOPLE);
        }
        return projectService.create(workspaceId, request, requester);
    }

    @GetMapping
    public List<ProjectResponse> findAll(
        @PathVariable String workspaceId,
        @RequestParam(name = "assignedToMe", defaultValue = "false") boolean assignedToMe,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return projectService.findAll(workspaceId, requester, assignedToMe);
    }

    @GetMapping("/my-stats")
    public DashboardStatsResponse myStats(@PathVariable String workspaceId, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return projectService.getMyDashboardStats(workspaceId, requester);
    }

    @PostMapping("/random")
    public ProjectResponse randomProject(
        @PathVariable String workspaceId,
        @RequestBody(required = false) RandomProjectRequest request,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        String teamId = request != null ? request.getTeamId() : null;
        return projectService.randomProject(workspaceId, requester, teamId);
    }

    @GetMapping("/{id}")
    public ProjectResponse findById(@PathVariable String workspaceId, @PathVariable String id,
                                    Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireActiveMembership(workspaceId, requester);
        return projectService.findById(workspaceId, id, requester);
    }

    @PutMapping("/{id}")
    public ProjectResponse update(@PathVariable String workspaceId,
                                  @PathVariable String id,
                                  @Valid @RequestBody ProjectRequest request,
                                  Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.EDIT_PROJECT);
        if (request.getMemberIds() != null) {
            workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.ASSIGN_PEOPLE);
        }
        String assignedByUserId = requester.getId();
        return projectService.update(workspaceId, id, request, assignedByUserId, requester);
    }

    @PostMapping("/{id}/random-assign")
    public RandomAssignResponse randomAssign(
        @PathVariable String workspaceId,
        @PathVariable String id,
        @RequestBody(required = false) RandomAssignRequest request,
        Authentication authentication
    ) {
        User requester = getRequester(authentication);
        workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.ASSIGN_PEOPLE);
        String teamId = request != null ? request.getTeamId() : null;
        return projectService.randomAssign(workspaceId, id, requester, teamId);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String workspaceId, @PathVariable String id, Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.DELETE_PROJECT);
        projectService.delete(workspaceId, id, requester);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
