package com.pmd.workspace.service;

import com.pmd.user.model.User;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import com.pmd.workspace.model.WorkspaceJoinRequest;
import com.pmd.workspace.model.WorkspaceJoinRequestStatus;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.repository.WorkspaceInviteRepository;
import com.pmd.workspace.repository.WorkspaceJoinRequestRepository;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import com.pmd.workspace.repository.WorkspaceRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class WorkspaceService {

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern TRIM_DASH = Pattern.compile("(^-+|-+$)");

    private final WorkspaceRepository workspaceRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final WorkspaceInviteRepository workspaceInviteRepository;
    private final WorkspaceJoinRequestRepository workspaceJoinRequestRepository;
    private final DemoWorkspaceSeeder demoWorkspaceSeeder;

    public WorkspaceService(WorkspaceRepository workspaceRepository,
                            WorkspaceMemberRepository workspaceMemberRepository,
                            WorkspaceInviteRepository workspaceInviteRepository,
                            WorkspaceJoinRequestRepository workspaceJoinRequestRepository,
                            DemoWorkspaceSeeder demoWorkspaceSeeder) {
        this.workspaceRepository = workspaceRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.workspaceInviteRepository = workspaceInviteRepository;
        this.workspaceJoinRequestRepository = workspaceJoinRequestRepository;
        this.demoWorkspaceSeeder = demoWorkspaceSeeder;
    }

    public WorkspaceMembership createWorkspace(String name, User creator) {
        String trimmed = name != null ? name.trim() : "";
        if (trimmed.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace name is required");
        }
        if (workspaceRepository.existsByNameIgnoreCase(trimmed)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace name already exists");
        }
        String slug = slugify(trimmed);
        if (slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid workspace name");
        }
        if (workspaceRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workspace slug already exists");
        }
        Instant now = Instant.now();
        Workspace workspace = new Workspace();
        workspace.setName(trimmed);
        workspace.setSlug(slug);
        workspace.setCreatedAt(now);
        workspace.setCreatedByUserId(creator != null ? creator.getId() : null);
        workspace.setDemo(false);
        workspace.setRequireApproval(false);
        Workspace saved = workspaceRepository.save(workspace);

        WorkspaceMember member = new WorkspaceMember();
        member.setWorkspaceId(saved.getId());
        member.setUserId(creator != null ? creator.getId() : null);
        member.setRole(WorkspaceMemberRole.OWNER);
        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        member.setCreatedAt(now);
        WorkspaceMember savedMember = workspaceMemberRepository.save(member);
        return new WorkspaceMembership(saved, savedMember);
    }

    public List<WorkspaceMembership> listWorkspacesFor(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        List<WorkspaceMember> memberships = workspaceMemberRepository.findByUserId(user.getId());
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<String> workspaceIds = memberships.stream()
            .map(WorkspaceMember::getWorkspaceId)
            .distinct()
            .toList();
        Map<String, Workspace> workspacesById = workspaceRepository.findAllById(workspaceIds).stream()
            .collect(Collectors.toMap(Workspace::getId, workspace -> workspace));
        return memberships.stream()
            .map(member -> new WorkspaceMembership(workspacesById.get(member.getWorkspaceId()), member))
            .filter(membership -> membership.workspace() != null)
            .sorted(Comparator.comparing(membership -> membership.workspace().getName(), String.CASE_INSENSITIVE_ORDER))
            .toList();
    }

    public WorkspaceMembership joinWorkspace(String inviteInput, User user) {
        WorkspaceInvite invite = resolveInvite(inviteInput);
        Instant now = Instant.now();
        if (invite.getInvitedEmail() != null && user != null) {
            String email = user.getEmail();
            if (email == null || !invite.getInvitedEmail().equalsIgnoreCase(email)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invite does not match this user");
            }
        }
        Workspace workspace = workspaceRepository.findById(invite.getWorkspaceId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        Optional<WorkspaceMember> existing = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspace.getId(), user.getId());
        if (existing.isPresent() && existing.get().getStatus() == WorkspaceMemberStatus.ACTIVE) {
            return new WorkspaceMembership(workspace, existing.get());
        }

        WorkspaceMember member = existing.orElseGet(WorkspaceMember::new);
        member.setWorkspaceId(workspace.getId());
        member.setUserId(user.getId());
        member.setRole(WorkspaceMemberRole.MEMBER);

        if (workspace.isRequireApproval()) {
            member.setStatus(WorkspaceMemberStatus.PENDING);
            member.setCreatedAt(member.getCreatedAt() != null ? member.getCreatedAt() : now);
            WorkspaceMember savedMember = workspaceMemberRepository.save(member);
            createJoinRequest(workspace.getId(), user, now);
            return new WorkspaceMembership(workspace, savedMember);
        }

        member.setStatus(WorkspaceMemberStatus.ACTIVE);
        member.setCreatedAt(member.getCreatedAt() != null ? member.getCreatedAt() : now);
        WorkspaceMember savedMember = workspaceMemberRepository.save(member);
        incrementInviteUses(invite);
        return new WorkspaceMembership(workspace, savedMember);
    }

    public WorkspaceInvite createInvite(String workspaceId, User requester, Instant expiresAt, Integer maxUses) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        if (maxUses != null && maxUses < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Max uses must be at least 1");
        }
        WorkspaceInvite invite = new WorkspaceInvite();
        invite.setWorkspaceId(workspaceId);
        invite.setToken(generateToken());
        invite.setCode(generateInviteCode());
        invite.setExpiresAt(expiresAt != null ? expiresAt : Instant.now().plus(7, ChronoUnit.DAYS));
        invite.setMaxUses(maxUses != null ? maxUses : 10);
        invite.setUsesCount(0);
        invite.setRevoked(false);
        invite.setCreatedAt(Instant.now());
        invite.setCreatedByUserId(requester.getId());
        return workspaceInviteRepository.save(invite);
    }

    public List<WorkspaceInvite> listInvites(String workspaceId, User requester) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        return workspaceInviteRepository.findAll().stream()
            .filter(invite -> workspaceId.equals(invite.getWorkspaceId()))
            .sorted(Comparator.comparing(WorkspaceInvite::getCreatedAt).reversed())
            .toList();
    }

    public WorkspaceInvite revokeInvite(String workspaceId, String inviteId, User requester) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        WorkspaceInvite invite = workspaceInviteRepository.findById(inviteId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found"));
        if (!workspaceId.equals(invite.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found");
        }
        invite.setRevoked(true);
        return workspaceInviteRepository.save(invite);
    }

    public WorkspaceInvite resolveInvite(String inviteInput) {
        if (inviteInput == null || inviteInput.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invite token is required");
        }
        String trimmed = inviteInput.trim();
        WorkspaceInvite invite = workspaceInviteRepository.findByToken(trimmed)
            .orElseGet(() -> workspaceInviteRepository.findByCode(trimmed)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invite not found")));
        validateInvite(invite);
        return invite;
    }

    public List<WorkspaceJoinRequest> listPendingRequests(String workspaceId, User requester) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        return workspaceJoinRequestRepository.findByWorkspaceIdAndStatus(
            workspaceId, WorkspaceJoinRequestStatus.PENDING);
    }

    public WorkspaceJoinRequest approveRequest(String workspaceId, String requestId, User requester) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        WorkspaceJoinRequest request = workspaceJoinRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!workspaceId.equals(request.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        }
        request.setStatus(WorkspaceJoinRequestStatus.APPROVED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(requester.getId());
        workspaceJoinRequestRepository.save(request);
        WorkspaceMember joiner = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspaceId, request.getUserId())
            .orElseGet(WorkspaceMember::new);
        joiner.setWorkspaceId(workspaceId);
        joiner.setUserId(request.getUserId());
        joiner.setRole(WorkspaceMemberRole.MEMBER);
        joiner.setStatus(WorkspaceMemberStatus.ACTIVE);
        if (joiner.getCreatedAt() == null) {
            joiner.setCreatedAt(request.getCreatedAt());
        }
        workspaceMemberRepository.save(joiner);
        return request;
    }

    public WorkspaceJoinRequest denyRequest(String workspaceId, String requestId, User requester) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        WorkspaceJoinRequest request = workspaceJoinRequestRepository.findById(requestId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found"));
        if (!workspaceId.equals(request.getWorkspaceId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Request not found");
        }
        request.setStatus(WorkspaceJoinRequestStatus.DENIED);
        request.setDecidedAt(Instant.now());
        request.setDecidedByUserId(requester.getId());
        workspaceJoinRequestRepository.save(request);
        workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, request.getUserId())
            .ifPresent(workspaceMemberRepository::delete);
        return request;
    }

    public WorkspaceMembership updateSettings(String workspaceId, Boolean requireApproval, User requester) {
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!isAdminOrOwner(member, requester)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        if (requireApproval != null) {
            workspace.setRequireApproval(requireApproval);
        }
        Workspace saved = workspaceRepository.save(workspace);
        return new WorkspaceMembership(saved, member);
    }

    public WorkspaceMembership getOrCreateDemoWorkspace(User user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        String slug = "demo-" + user.getId();
        Workspace workspace = workspaceRepository.findBySlug(slug).orElse(null);
        if (workspace == null) {
            Workspace created = new Workspace();
            created.setName("Demo Workspace");
            created.setSlug(slug);
            created.setCreatedAt(Instant.now());
            created.setCreatedByUserId(user.getId());
            created.setDemo(true);
            workspace = workspaceRepository.save(created);
        }
        Workspace finalWorkspace = workspace;
        WorkspaceMember member = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(finalWorkspace.getId(), user.getId())
            .orElseGet(() -> {
                WorkspaceMember created = new WorkspaceMember();
                created.setWorkspaceId(finalWorkspace.getId());
                created.setUserId(user.getId());
                created.setRole(WorkspaceMemberRole.OWNER);
                created.setStatus(WorkspaceMemberStatus.ACTIVE);
                created.setCreatedAt(Instant.now());
                return workspaceMemberRepository.save(created);
            });
        demoWorkspaceSeeder.seedWorkspace(finalWorkspace.getId(), user);
        return new WorkspaceMembership(finalWorkspace, member);
    }

    public void resetDemoWorkspace(String workspaceId, User requester) {
        Workspace workspace = workspaceRepository.findById(workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
        if (!workspace.isDemo()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace is not demo");
        }
        WorkspaceMember member = requireActiveMembership(workspaceId, requester);
        if (!(member.getRole() == WorkspaceMemberRole.OWNER || member.getRole() == WorkspaceMemberRole.ADMIN)
            && !requester.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not allowed");
        }
        demoWorkspaceSeeder.resetWorkspaceData(workspaceId);
        demoWorkspaceSeeder.seedWorkspace(workspaceId, requester);
    }

    public WorkspaceMember requireActiveMembership(String workspaceId, User user) {
        if (workspaceId == null || workspaceId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workspace is required");
        }
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .filter(member -> member.getStatus() == WorkspaceMemberStatus.ACTIVE)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workspace not found"));
    }

    private boolean isAdminOrOwner(WorkspaceMember member, User requester) {
        return member.getRole() == WorkspaceMemberRole.ADMIN
            || member.getRole() == WorkspaceMemberRole.OWNER
            || (requester != null && requester.isAdmin());
    }

    private void validateInvite(WorkspaceInvite invite) {
        if (invite.isRevoked()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite revoked");
        }
        Instant now = Instant.now();
        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(now)) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite expired");
        }
        if (invite.getMaxUses() != null && invite.getUsesCount() >= invite.getMaxUses()) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invite exhausted");
        }
    }

    private void incrementInviteUses(WorkspaceInvite invite) {
        invite.setUsesCount(invite.getUsesCount() + 1);
        if (invite.getMaxUses() != null && invite.getUsesCount() >= invite.getMaxUses()) {
            invite.setRevoked(true);
        }
        workspaceInviteRepository.save(invite);
    }

    private void createJoinRequest(String workspaceId, User user, Instant now) {
        WorkspaceJoinRequest existing = workspaceJoinRequestRepository
            .findByWorkspaceIdAndUserId(workspaceId, user.getId())
            .orElse(null);
        if (existing != null && existing.getStatus() == WorkspaceJoinRequestStatus.PENDING) {
            return;
        }
        WorkspaceJoinRequest request = new WorkspaceJoinRequest();
        request.setWorkspaceId(workspaceId);
        request.setUserId(user.getId());
        request.setStatus(WorkspaceJoinRequestStatus.PENDING);
        request.setCreatedAt(now);
        workspaceJoinRequestRepository.save(request);
    }

    private String generateToken() {
        return UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", "");
    }

    private String generateInviteCode() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder builder = new StringBuilder("PMD-");
        for (int i = 0; i < 6; i++) {
            int idx = ThreadLocalRandom.current().nextInt(alphabet.length());
            builder.append(alphabet.charAt(idx));
        }
        return builder.toString();
    }

    public Optional<WorkspaceMember> findMembership(String workspaceId, String userId) {
        if (workspaceId == null || userId == null) {
            return Optional.empty();
        }
        return workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, userId);
    }

    public String findWorkspaceName(String workspaceId) {
        if (workspaceId == null) {
            return null;
        }
        return workspaceRepository.findById(workspaceId)
            .map(Workspace::getName)
            .orElse(null);
    }

    public String slugify(String input) {
        if (input == null) {
            return "";
        }
        String lower = input.trim().toLowerCase(Locale.ROOT);
        String dashed = NON_ALNUM.matcher(lower).replaceAll("-");
        return TRIM_DASH.matcher(dashed).replaceAll("");
    }

    public record WorkspaceMembership(Workspace workspace, WorkspaceMember member) {
    }
}
