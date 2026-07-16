package com.pmd.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspacePermission;
import com.pmd.workspace.model.WorkspaceRole;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRoleRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

/**
 * The privilege ceiling that guards create/update/assign-role must also guard the invite's
 * default role. Every plain Member has INVITE_MEMBERS by default, so without it a Member could
 * hand out a Manager-level role through an invite and escalate an accomplice past their own rank.
 */
@SpringBootTest
class InvitePrivilegeCeilingTest {

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private WorkspaceRoleRepository workspaceRoleRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private UserRepository userRepository;

    private WorkspaceRole roleByName(String workspaceId, String name) {
        return workspaceRoleRepository.findByWorkspaceId(workspaceId).stream()
            .filter(r -> name.equalsIgnoreCase(r.getName()))
            .findFirst()
            .orElseThrow(() -> new AssertionError("default role '" + name + "' missing"));
    }

    private User savedUser(String prefix) {
        User user = new User();
        user.setUsername(prefix + System.nanoTime() + "@pmd.local");
        user.setEmail(user.getUsername());
        user.setDisplayName(prefix);
        return userRepository.save(user);
    }

    @Test
    void aPlainMemberCannotMintAnInviteAboveTheirOwnRole() {
        User owner = savedUser("owner-");
        String workspaceId = workspaceService
            .createWorkspace("Ceiling Test " + System.nanoTime(), List.of(), owner)
            .workspace().getId();

        // The system defaults: Member has INVITE_MEMBERS but not manage-settings; Manager
        // (a non-owner role) grants manage-settings + approve-requests, which Member lacks —
        // so handing out Manager via an invite is a genuine escalation.
        WorkspaceRole memberRole = roleByName(workspaceId, "member");
        WorkspaceRole elevatedRole = roleByName(workspaceId, "manager");
        assertThat(memberRole.getPermissions().allows(WorkspacePermission.INVITE_MEMBERS)).isTrue();
        assertThat(memberRole.getPermissions().allows(WorkspacePermission.MANAGE_WORKSPACE_SETTINGS)).isFalse();
        assertThat(elevatedRole.getPermissions().allows(WorkspacePermission.MANAGE_WORKSPACE_SETTINGS)).isTrue();

        // A genuine plain member of the workspace.
        User member = savedUser("member-");
        WorkspaceMember membership = new WorkspaceMember();
        membership.setWorkspaceId(workspaceId);
        membership.setUserId(member.getId());
        membership.setRoleId(memberRole.getId());
        membership.setDisplayRoleName(memberRole.getName());
        membership.setRole(WorkspaceMemberRole.MEMBER);
        membership.setStatus(WorkspaceMemberStatus.ACTIVE);
        membership.setCreatedAt(Instant.now());
        membership.setJoinedAt(Instant.now());
        workspaceMemberRepository.save(membership);

        // Handing out the elevated role via an invite must be refused...
        assertThatThrownBy(() -> workspaceService.createInvite(
                workspaceId, member, null, null, elevatedRole.getId(), null, null))
            .isInstanceOf(ResponseStatusException.class);

        // ...while an invite for their own role stays allowed.
        assertThatCode(() -> workspaceService.createInvite(
                workspaceId, member, null, null, memberRole.getId(), null, null))
            .doesNotThrowAnyException();
    }

    @Test
    void anAdminBypassesTheCeiling() {
        User owner = savedUser("owner-");
        String workspaceId = workspaceService
            .createWorkspace("Ceiling Admin " + System.nanoTime(), List.of(), owner)
            .workspace().getId();
        WorkspaceRole elevatedRole = roleByName(workspaceId, "manager");

        User platformAdmin = savedUser("admin-");
        platformAdmin.setAdmin(true);
        platformAdmin = userRepository.save(platformAdmin);

        // A platform admin is not bound by an in-workspace ceiling.
        User adminRef = platformAdmin;
        assertThatCode(() -> workspaceService.createInvite(
                workspaceId, adminRef, null, null, elevatedRole.getId(), null, null))
            .doesNotThrowAnyException();
    }
}
