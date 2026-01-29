package com.pmd.auth.policy;

import com.pmd.project.model.Project;
import com.pmd.user.model.User;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AccessPolicy {

    public boolean isAdmin(User requester) {
        return requester != null && requester.isAdmin();
    }

    public void assertCanViewUser(User requester, User target) {
        if (isAdmin(requester)) {
            return;
        }
        if (target == null || target.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
    }

    public void assertCanViewProject(User requester, Project project) {
        if (isAdmin(requester)) {
            return;
        }
        if (project == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
    }

    public void assertCanAssignUserToProject(User requester, User assignee, Project project) {
        assertCanViewProject(requester, project);
        if (isAdmin(requester)) {
            return;
        }
        if (assignee != null && assignee.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot assign admin users");
        }
    }
}
