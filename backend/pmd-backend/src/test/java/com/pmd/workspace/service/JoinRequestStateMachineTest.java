package com.pmd.workspace.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.repository.WorkspaceJoinRequestRepository;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.server.ResponseStatusException;

/**
 * The approve/deny flow mutates two documents with no transaction, so order and status guards
 * are what keep it correct. These pin the two data-corruption paths: approving into a full
 * workspace must not strand the request, and denying a stale request must not delete an
 * already-active member.
 */
@SpringBootTest
class JoinRequestStateMachineTest {

    @Autowired
    private WorkspaceService workspaceService;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private WorkspaceJoinRequestRepository workspaceJoinRequestRepository;

    @Autowired
    private UserRepository userRepository;

    private User savedUser(String prefix) {
        User user = new User();
        user.setUsername(prefix + System.nanoTime() + "@pmd.local");
        user.setEmail(user.getUsername());
        user.setDisplayName(prefix);
        return userRepository.save(user);
    }

    private WorkspaceMember member(String workspaceId, String userId, WorkspaceMemberStatus status) {
        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(workspaceId);
        member.setUserId(userId);
        member.setRole(WorkspaceMemberRole.MEMBER);
        member.setStatus(status);
        member.setCreatedAt(Instant.now());
        return workspaceMemberRepository.save(member);
    }

    private WorkspaceJoinRequest pendingRequest(String workspaceId, String userId) {
        WorkspaceJoinRequest request = new WorkspaceJoinRequest();
        request.setWorkspaceId(workspaceId);
        request.setUserId(userId);
        request.setStatus(WorkspaceJoinRequestStatus.PENDING);
        request.setCreatedAt(Instant.now());
        return workspaceJoinRequestRepository.save(request);
    }

    @Test
    void approvingIntoAFullWorkspaceLeavesTheRequestPending() {
        User owner = savedUser("owner-");
        String workspaceId = workspaceService
            .createWorkspace("Cap " + System.nanoTime(), List.of(), owner)
            .workspace().getId();
        // The owner already occupies the single seat.
        Workspace workspace = workspaceRepository.findById(workspaceId).orElseThrow();
        workspace.setMaxMembers(1);
        workspaceRepository.save(workspace);

        User joiner = savedUser("joiner-");
        member(workspaceId, joiner.getId(), WorkspaceMemberStatus.PENDING);
        WorkspaceJoinRequest request = pendingRequest(workspaceId, joiner.getId());

        assertThatThrownBy(() -> workspaceService.approveRequest(workspaceId, request.getId(), owner))
            .isInstanceOf(ResponseStatusException.class);

        // The request must survive as PENDING so it can be approved once a seat frees — not be
        // stranded as APPROVED-but-not-a-member, invisible to the approver and un-re-approvable.
        WorkspaceJoinRequest after = workspaceJoinRequestRepository.findById(request.getId()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(WorkspaceJoinRequestStatus.PENDING);
    }

    @Test
    void denyingAStaleRequestDoesNotRemoveAnActiveMember() {
        User owner = savedUser("owner-");
        String workspaceId = workspaceService
            .createWorkspace("Deny " + System.nanoTime(), List.of(), owner)
            .workspace().getId();

        // The joiner is already an ACTIVE member, but a stale PENDING request still lingers
        // (e.g. approval was toggled off and they re-joined directly).
        User joiner = savedUser("joiner-");
        member(workspaceId, joiner.getId(), WorkspaceMemberStatus.ACTIVE);
        WorkspaceJoinRequest stale = pendingRequest(workspaceId, joiner.getId());

        workspaceService.denyRequest(workspaceId, stale.getId(), owner);

        // The request is denied, but the active membership must remain untouched.
        assertThat(workspaceJoinRequestRepository.findById(stale.getId()).orElseThrow().getStatus())
            .isEqualTo(WorkspaceJoinRequestStatus.DENIED);
        assertThat(workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, joiner.getId()))
            .get()
            .satisfies(m -> assertThat(m.getStatus()).isEqualTo(WorkspaceMemberStatus.ACTIVE));
    }
}
