package com.pmd.mention.controller;

import com.pmd.auth.security.UserPrincipal;
import com.pmd.mention.dto.MentionAuditEventResponse;
import com.pmd.mention.dto.MentionRestrictionResponse;
import com.pmd.mention.service.MentionPolicyService;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/mentions")
public class MentionModerationController {

    private final MentionPolicyService mentionPolicyService;
    private final UserService userService;

    public MentionModerationController(MentionPolicyService mentionPolicyService, UserService userService) {
        this.mentionPolicyService = mentionPolicyService;
        this.userService = userService;
    }

    @GetMapping("/restrictions")
    public List<MentionRestrictionResponse> listRestrictions(@PathVariable String workspaceId, Authentication authentication) {
        return mentionPolicyService.listRestrictions(workspaceId, getRequester(authentication));
    }

    @GetMapping("/audit")
    public List<MentionAuditEventResponse> listAudit(@PathVariable String workspaceId,
                                                     @RequestParam(required = false) String userId,
                                                     Authentication authentication) {
        return mentionPolicyService.listAudit(workspaceId, userId, getRequester(authentication));
    }

    @DeleteMapping("/restrictions/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearRestriction(@PathVariable String workspaceId,
                                 @PathVariable String userId,
                                 Authentication authentication) {
        mentionPolicyService.clearRestriction(workspaceId, userId, getRequester(authentication));
    }

    private User getRequester(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return userService.findById(principal.getId());
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }
}
