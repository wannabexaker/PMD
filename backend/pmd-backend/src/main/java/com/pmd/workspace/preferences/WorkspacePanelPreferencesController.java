package com.pmd.workspace.preferences;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/preferences/panels")
public class WorkspacePanelPreferencesController {

    private final WorkspacePanelPreferencesService service;
    private final UserService userService;
    private final WorkspaceService workspaceService;

    public WorkspacePanelPreferencesController(WorkspacePanelPreferencesService service, UserService userService,
                                                WorkspaceService workspaceService) {
        this.service = service;
        this.userService = userService;
        this.workspaceService = workspaceService;
    }

    @GetMapping
    public WorkspacePanelPreferencesResponse getPreferences(@PathVariable String workspaceId,
                                                            Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.VIEW_STATS);
        return service.getPreferences(workspaceId, requester);
    }

    @PutMapping
    public WorkspacePanelPreferencesResponse updatePreferences(@PathVariable String workspaceId,
                                                               @Valid @RequestBody WorkspacePanelPreferencesRequest request,
                                                               Authentication authentication) {
        User requester = getRequester(authentication);
        workspaceService.requireWorkspacePermission(requester, workspaceId, WorkspacePermission.VIEW_STATS);
        return service.savePreferences(workspaceId, requester, request);
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
