package com.pmd.project.service;

import com.pmd.auth.policy.AccessPolicy;
import com.pmd.notification.event.ProjectAssignmentCreated;
import com.pmd.project.dto.ProjectCommentResponse;
import com.pmd.project.dto.DashboardStatsResponse;
import com.pmd.project.dto.ProjectRequest;
import com.pmd.project.dto.ProjectResponse;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectComment;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final AccessPolicy accessPolicy;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository,
                          ApplicationEventPublisher eventPublisher, AccessPolicy accessPolicy) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
        this.accessPolicy = accessPolicy;
    }

    public ProjectResponse create(ProjectRequest request, User requester) {
        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setStatus(request.getStatus());
        project.setMemberIds(request.getMemberIds());
        project.setComments(new ArrayList<>());
        project.setCreatedAt(Instant.now());
        project.setCreatedByUserId(requester.getId());
        project.setCreatedByTeam(requester.getTeam());

        validateAssignees(requester, project, request.getMemberIds());

        Project saved = projectRepository.save(project);
        return toResponse(saved);
    }

    public List<ProjectResponse> findAll(User requester) {
        boolean isAdmin = accessPolicy.isAdmin(requester);
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (!isAdmin) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }
        return projects.stream()
            .map(this::toResponse)
            .toList();
    }

    public ProjectResponse findById(String id, User requester) {
        Project project = getByIdForUser(id, requester);
        return toResponse(project);
    }

    public ProjectResponse update(String id, ProjectRequest request, String assignedByUserId, User requester) {
        Project project = getByIdForUser(id, requester);
        List<String> previousMemberIds = project.getMemberIds() != null
            ? new ArrayList<>(project.getMemberIds())
            : List.of();

        validateAssignees(requester, project, request.getMemberIds());

        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setStatus(request.getStatus());
        project.setMemberIds(request.getMemberIds());
        project.setUpdatedAt(Instant.now());

        Project saved = projectRepository.save(project);
        publishAssignmentEvents(saved, previousMemberIds, assignedByUserId);
        return toResponse(saved);
    }

    public void delete(String id, User requester) {
        Project project = getByIdForUser(id, requester);
        projectRepository.delete(project);
    }

    public DashboardStatsResponse getMyDashboardStats(User requester) {
        boolean isAdmin = accessPolicy.isAdmin(requester);
        String userId = requester.getId();
        List<Project> projects = projectRepository.findByMemberIdsContaining(userId);
        if (!isAdmin) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }

        Map<ProjectStatus, Long> statusCounts = new EnumMap<>(ProjectStatus.class);
        long activeCount = 0;
        long inactiveCount = 0;
        Map<String, Long> workloadMinutes = new java.util.LinkedHashMap<>();
        Map<String, Long> workloadComments = new java.util.LinkedHashMap<>();
        long totalMinutes = 0;
        long totalComments = 0;

        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            statusCounts.put(status, statusCounts.getOrDefault(status, 0L) + 1);
            if (status == ProjectStatus.NOT_STARTED || status == ProjectStatus.IN_PROGRESS) {
                activeCount += 1;
            } else {
                inactiveCount += 1;
            }

            long minutesForProject = 0;
            long commentsForProject = 0;
            if (project.getComments() != null) {
                for (ProjectComment comment : project.getComments()) {
                    if (comment != null && userId.equals(comment.getAuthorId())) {
                        commentsForProject += 1;
                        minutesForProject += Math.max(comment.getTimeSpentMinutes(), 0);
                    }
                }
            }
            if (minutesForProject > 0) {
                workloadMinutes.put(project.getName() != null ? project.getName() : "Untitled", minutesForProject);
                totalMinutes += minutesForProject;
            }
            if (commentsForProject > 0) {
                workloadComments.put(project.getName() != null ? project.getName() : "Untitled", commentsForProject);
                totalComments += commentsForProject;
            }
        }

        List<DashboardStatsResponse.StatSlice> statusBreakdown = List.of(
            new DashboardStatsResponse.StatSlice("Not started", statusCounts.getOrDefault(ProjectStatus.NOT_STARTED, 0L)),
            new DashboardStatsResponse.StatSlice("In progress", statusCounts.getOrDefault(ProjectStatus.IN_PROGRESS, 0L)),
            new DashboardStatsResponse.StatSlice("Completed", statusCounts.getOrDefault(ProjectStatus.COMPLETED, 0L)),
            new DashboardStatsResponse.StatSlice("Canceled", statusCounts.getOrDefault(ProjectStatus.CANCELED, 0L))
        );

        if (statusCounts.containsKey(ProjectStatus.ARCHIVED)) {
            statusBreakdown = new java.util.ArrayList<>(statusBreakdown);
            statusBreakdown.add(new DashboardStatsResponse.StatSlice(
                "Archived", statusCounts.getOrDefault(ProjectStatus.ARCHIVED, 0L)
            ));
        }

        List<DashboardStatsResponse.StatSlice> workloadBreakdown = new java.util.ArrayList<>();
        if (totalMinutes > 0) {
            for (Map.Entry<String, Long> entry : workloadMinutes.entrySet()) {
                workloadBreakdown.add(new DashboardStatsResponse.StatSlice(entry.getKey(), entry.getValue()));
            }
        } else if (totalComments > 0) {
            for (Map.Entry<String, Long> entry : workloadComments.entrySet()) {
                workloadBreakdown.add(new DashboardStatsResponse.StatSlice(entry.getKey(), entry.getValue()));
            }
        }

        long archivedCount = statusCounts.getOrDefault(ProjectStatus.ARCHIVED, 0L);
        long inactiveTotal = inactiveCount + archivedCount;
        List<DashboardStatsResponse.StatSlice> activeInactiveBreakdown = List.of(
            new DashboardStatsResponse.StatSlice("Active", activeCount),
            new DashboardStatsResponse.StatSlice("Inactive", inactiveTotal)
        );

        return new DashboardStatsResponse(statusBreakdown, workloadBreakdown, activeInactiveBreakdown);
    }

    private ProjectResponse toResponse(Project project) {
        List<ProjectCommentResponse> commentResponses = null;
        if (project.getComments() != null) {
            commentResponses = project.getComments().stream()
                .map(this::toCommentResponse)
                .toList();
        }

        return new ProjectResponse(
            project.getId(),
            project.getName(),
            project.getDescription(),
            project.getStatus(),
            project.getMemberIds(),
            commentResponses,
            project.getCreatedAt(),
            project.getUpdatedAt()
        );
    }

    private Project getByIdOrThrow(String id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private Project getByIdForUser(String id, User requester) {
        Project project = getByIdOrThrow(id);
        if (!accessPolicy.isAdmin(requester) && isAuthoredByAdmin(project)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found");
        }
        accessPolicy.assertCanViewProject(requester, project);
        return project;
    }

    private ProjectCommentResponse toCommentResponse(ProjectComment comment) {
        return new ProjectCommentResponse(
            comment.getCommentId(),
            comment.getAuthorId(),
            comment.getMessage(),
            comment.getTimeSpentMinutes(),
            comment.getCreatedAt()
        );
    }

    private void validateAssignees(User requester, Project project, List<String> memberIds) {
        if (accessPolicy.isAdmin(requester) || memberIds == null || memberIds.isEmpty()) {
            return;
        }
        List<User> users = userRepository.findAllById(memberIds);
        for (User user : users) {
            accessPolicy.assertCanAssignUserToProject(requester, user, project);
        }
    }

    private void publishAssignmentEvents(Project project, List<String> previousMemberIds, String assignedByUserId) {
        List<String> current = project.getMemberIds() != null ? project.getMemberIds() : List.of();
        if (current.isEmpty()) {
            return;
        }
        Set<String> previous = Set.copyOf(previousMemberIds);
        List<String> newlyAssignedIds = current.stream()
            .filter(id -> !previous.contains(id))
            .toList();
        if (newlyAssignedIds.isEmpty()) {
            return;
        }
        List<User> users = userRepository.findAllById(newlyAssignedIds).stream()
            .collect(Collectors.toList());
        Instant assignedAt = Instant.now();
        for (User user : users) {
            eventPublisher.publishEvent(new ProjectAssignmentCreated(
                project.getId(),
                project.getName(),
                project.getStatus() != null ? project.getStatus().name() : null,
                project.getDescription(),
                user.getId(),
                user.getEmail(),
                assignedByUserId,
                assignedAt
            ));
        }
    }

    private boolean isVisibleToNonAdmin(Project project, Map<String, Boolean> authorAdminFlags) {
        String authorId = project.getCreatedByUserId();
        if (authorId == null) {
            return true;
        }
        Boolean isAdminAuthor = authorAdminFlags.get(authorId);
        return isAdminAuthor == null || !isAdminAuthor;
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

    private Map<String, Boolean> loadAuthorAdminFlags(List<Project> projects) {
        Set<String> authorIds = projects.stream()
            .map(Project::getCreatedByUserId)
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        if (authorIds.isEmpty()) {
            return Map.of();
        }
        Map<String, Boolean> flags = new HashMap<>();
        for (User user : userRepository.findAllById(authorIds)) {
            if (user.getId() != null) {
                flags.put(user.getId(), accessPolicy.isAdmin(user));
            }
        }
        return flags;
    }
}
