package com.pmd.project.service;

import com.pmd.auth.policy.AccessPolicy;
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
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectCommentService {

    private static final int MAX_PAGE_SIZE = 100;

    private final ProjectCommentRepository commentRepository;
    private final ProjectRepository projectRepository;
    private final AccessPolicy accessPolicy;
    private final UserRepository userRepository;

    public ProjectCommentService(ProjectCommentRepository commentRepository, ProjectRepository projectRepository,
                                 AccessPolicy accessPolicy, UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.projectRepository = projectRepository;
        this.accessPolicy = accessPolicy;
        this.userRepository = userRepository;
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
}
