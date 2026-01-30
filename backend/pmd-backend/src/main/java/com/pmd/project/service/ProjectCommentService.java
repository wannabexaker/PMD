package com.pmd.project.service;

import com.pmd.auth.policy.AccessPolicy;
import com.pmd.notification.EmailNotificationService;
import com.pmd.project.dto.CommentAttachmentResponse;
import com.pmd.project.dto.ProjectCommentCreateRequest;
import com.pmd.project.dto.ProjectCommentItemResponse;
import com.pmd.project.dto.ProjectCommentReactionRequest;
import com.pmd.project.model.CommentAttachment;
import com.pmd.project.model.CommentReactionType;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectCommentEntity;
import com.pmd.project.repository.ProjectCommentRepository;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectCommentService {

    private static final int MAX_PAGE_SIZE = 100;
    private static final Pattern EMAIL_MENTION = Pattern.compile("@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})");
    private static final Pattern TEAM_MENTION = Pattern.compile("(?i)@team(mention)?\\b");

    private final ProjectCommentRepository commentRepository;
    private final ProjectRepository projectRepository;
    private final AccessPolicy accessPolicy;
    private final UserRepository userRepository;
    private final UserService userService;
    private final EmailNotificationService emailNotificationService;

    public ProjectCommentService(ProjectCommentRepository commentRepository, ProjectRepository projectRepository,
                                 AccessPolicy accessPolicy, UserRepository userRepository,
                                 UserService userService, EmailNotificationService emailNotificationService) {
        this.commentRepository = commentRepository;
        this.projectRepository = projectRepository;
        this.accessPolicy = accessPolicy;
        this.userRepository = userRepository;
        this.userService = userService;
        this.emailNotificationService = emailNotificationService;
    }

    public Page<ProjectCommentItemResponse> listComments(String workspaceId, String projectId, int page, int size,
                                                         User requester) {
        Project project = getProjectForUser(workspaceId, projectId, requester);
        accessPolicy.assertCanViewProject(requester, project);
        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        PageRequest pageRequest = PageRequest.of(Math.max(page, 0), safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        return commentRepository.findByProjectId(projectId, pageRequest)
            .map(this::toResponse);
    }

    public ProjectCommentItemResponse addComment(String workspaceId, String projectId,
                                                 ProjectCommentCreateRequest request, User requester) {
        Project project = getProjectForUser(workspaceId, projectId, requester);
        accessPolicy.assertCanViewProject(requester, project);
        if (request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Message is required");
        }
        Integer timeSpent = request.getTimeSpentMinutes();
        if (timeSpent != null && (timeSpent < 1 || timeSpent > 1440)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Time spent must be between 1 and 1440");
        }

        ProjectCommentEntity entity = new ProjectCommentEntity();
        entity.setProjectId(projectId);
        entity.setAuthorUserId(requester.getId());
        entity.setAuthorName(requester.getDisplayName() != null ? requester.getDisplayName() : requester.getEmail());
        entity.setMessage(request.getMessage().trim());
        entity.setCreatedAt(Instant.now());
        entity.setTimeSpentMinutes(timeSpent);
        entity.setReactions(new HashMap<>());
        if (request.getAttachment() != null) {
            entity.setAttachment(toAttachment(request.getAttachment()));
        }

        ProjectCommentEntity saved = commentRepository.save(entity);
        notifyMentions(workspaceId, project, requester, saved.getMessage());
        return toResponse(saved);
    }

    public ProjectCommentItemResponse toggleReaction(String workspaceId, String commentId,
                                                     ProjectCommentReactionRequest request, User requester) {
        ProjectCommentEntity comment = findCommentOrThrow(commentId);
        Project project = getProjectForUser(workspaceId, comment.getProjectId(), requester);
        accessPolicy.assertCanViewProject(requester, project);

        CommentReactionType type = Optional.ofNullable(request.getType())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reaction type required"));
        if (!EnumSet.allOf(CommentReactionType.class).contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported reaction");
        }

        Map<String, List<String>> reactions = comment.getReactions();
        if (reactions == null) {
            reactions = new HashMap<>();
        }
        String userId = requester.getId();
        String typeKey = type.name();

        String existingType = null;
        for (Map.Entry<String, List<String>> entry : reactions.entrySet()) {
            List<String> users = entry.getValue();
            if (users != null && users.contains(userId)) {
                existingType = entry.getKey();
                users.remove(userId);
            }
        }

        if (!typeKey.equals(existingType)) {
            reactions.computeIfAbsent(typeKey, key -> new ArrayList<>()).add(userId);
        }

        comment.setReactions(reactions);
        ProjectCommentEntity saved = commentRepository.save(comment);
        return toResponse(saved);
    }

    public void deleteComment(String workspaceId, String commentId, User requester) {
        ProjectCommentEntity comment = findCommentOrThrow(commentId);
        Project project = getProjectForUser(workspaceId, comment.getProjectId(), requester);
        accessPolicy.assertCanViewProject(requester, project);
        boolean isAdmin = accessPolicy.isAdmin(requester);
        if (!isAdmin && !requester.getId().equals(comment.getAuthorUserId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete comment");
        }
        commentRepository.delete(comment);
    }

    private Project getProjectForUser(String workspaceId, String projectId, User requester) {
        Project project = projectRepository.findByIdAndWorkspaceId(projectId, workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
        if (!accessPolicy.isAdmin(requester) && isAuthoredByAdmin(project)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
        return project;
    }

    private boolean isAuthoredByAdmin(Project project) {
        String authorId = project.getCreatedByUserId();
        if (authorId == null) {
            return false;
        }
        return userRepository.findById(authorId)
            .map(accessPolicy::isAdmin)
            .orElse(false);
    }

    private ProjectCommentEntity findCommentOrThrow(String commentId) {
        return commentRepository.findById(commentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Comment not found"));
    }

    private ProjectCommentItemResponse toResponse(ProjectCommentEntity comment) {
        CommentAttachmentResponse attachment = null;
        if (comment.getAttachment() != null) {
            CommentAttachment att = comment.getAttachment();
            attachment = new CommentAttachmentResponse(
                att.getId(),
                att.getUrl(),
                att.getContentType(),
                att.getFileName(),
                att.getSize()
            );
        }
        return new ProjectCommentItemResponse(
            comment.getId(),
            comment.getProjectId(),
            comment.getAuthorUserId(),
            comment.getAuthorName(),
            comment.getMessage(),
            comment.getCreatedAt(),
            comment.getTimeSpentMinutes(),
            comment.getReactions(),
            attachment
        );
    }

    private CommentAttachment toAttachment(CommentAttachmentResponse request) {
        return new CommentAttachment(
            request.getId(),
            request.getUrl(),
            request.getContentType(),
            request.getFileName(),
            request.getSize()
        );
    }

    private void notifyMentions(String workspaceId, Project project, User requester, String message) {
        if (message == null || message.isBlank()) {
            return;
        }
        Set<String> notifiedUserIds = new HashSet<>();
        List<User> workspaceUsers = userService.listUsersForWorkspace(workspaceId, false);
        Map<String, User> byEmail = new HashMap<>();
        for (User user : workspaceUsers) {
            if (user.getEmail() != null) {
                byEmail.put(user.getEmail().toLowerCase(Locale.ROOT), user);
            }
        }

        Matcher matcher = EMAIL_MENTION.matcher(message);
        while (matcher.find()) {
            String email = matcher.group(1);
            if (email == null) {
                continue;
            }
            User mentioned = byEmail.get(email.toLowerCase(Locale.ROOT));
            if (mentioned == null || mentioned.getId() == null) {
                continue;
            }
            if (requester != null && requester.getId() != null && requester.getId().equals(mentioned.getId())) {
                continue;
            }
            if (notifiedUserIds.add(mentioned.getId())) {
                emailNotificationService.sendMentionUser(mentioned, project, trimSnippet(message), requester);
            }
        }

        if (TEAM_MENTION.matcher(message).find() && project.getTeamId() != null) {
            for (User user : workspaceUsers) {
                if (user.getId() == null || user.getTeamId() == null) {
                    continue;
                }
                if (!project.getTeamId().equals(user.getTeamId())) {
                    continue;
                }
                if (requester != null && requester.getId() != null && requester.getId().equals(user.getId())) {
                    continue;
                }
                if (notifiedUserIds.add(user.getId())) {
                    emailNotificationService.sendMentionTeam(user, project, trimSnippet(message), requester);
                }
            }
        }
    }

    private String trimSnippet(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = text.trim();
        if (trimmed.length() <= 140) {
            return trimmed;
        }
        return trimmed.substring(0, 140) + "...";
    }
}
