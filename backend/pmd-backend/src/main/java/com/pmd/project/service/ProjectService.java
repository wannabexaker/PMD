package com.pmd.project.service;

import com.pmd.auth.policy.AccessPolicy;
import com.pmd.notification.event.ProjectAssignmentCreated;
import com.pmd.project.dto.ProjectCommentResponse;
import com.pmd.project.dto.DashboardStatsResponse;
import com.pmd.project.dto.ProjectRequest;
import com.pmd.project.dto.ProjectResponse;
import com.pmd.project.dto.RandomAssignResponse;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectComment;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.dto.UserSummaryResponse;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.user.service.UserService;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProjectService {

    private static final Logger log = LoggerFactory.getLogger(ProjectService.class);

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final ApplicationEventPublisher eventPublisher;
    private final AccessPolicy accessPolicy;
    private final MongoTemplate mongoTemplate;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository,
                          UserService userService, ApplicationEventPublisher eventPublisher,
                          AccessPolicy accessPolicy, MongoTemplate mongoTemplate) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.userService = userService;
        this.eventPublisher = eventPublisher;
        this.accessPolicy = accessPolicy;
        this.mongoTemplate = mongoTemplate;
    }

    public ProjectResponse create(ProjectRequest request, User requester) {
        log.debug(
            "Project create db={}, collection={}, requesterId={}, status={}, memberCount={}",
            mongoTemplate.getDb().getName(),
            mongoTemplate.getCollectionName(Project.class),
            requester.getId(),
            request.getStatus(),
            request.getMemberIds() != null ? request.getMemberIds().size() : 0
        );
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
        ProjectResponse response = toResponse(saved);
        log.debug(
            "Project created id={}, createdByUserId={}, createdByTeam={}, memberIds={}",
            saved.getId(),
            saved.getCreatedByUserId(),
            saved.getCreatedByTeam(),
            saved.getMemberIds()
        );
        return response;
    }

    public List<ProjectResponse> findAll(User requester, boolean assignedToMe) {
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        log.debug(
            "Project list db={}, collection={}, sort=createdAt DESC, isAdmin={}, assignedToMe={}, fetched={}",
            mongoTemplate.getDb().getName(),
            mongoTemplate.getCollectionName(Project.class),
            accessPolicy.isAdmin(requester),
            assignedToMe,
            projects.size()
        );
        if (assignedToMe) {
            String requesterId = requester.getId();
            int before = projects.size();
            projects = projects.stream()
                .filter(project -> requesterId != null && (project.getMemberIds() != null)
                    && project.getMemberIds().contains(requesterId))
                .toList();
            log.debug(
                "Project list assignedToMe filter applied memberId={}, before={}, after={}",
                requesterId,
                before,
                projects.size()
            );
        }
        return projects.stream()
            .map(this::toResponse)
            .toList();
    }

    public ProjectResponse findById(String id, User requester) {
        Project project = getByIdForUser(id, requester);
        return toResponse(project);
    }

    public ProjectResponse randomProject(User requester, String teamId) {
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        projects = projects.stream()
            .filter(this::isRandomEligibleProject)
            .toList();

        if (teamId != null && !teamId.isBlank()) {
            List<User> teamCandidates = userService.findAssignableUsers(null, teamId, accessPolicy.isAdmin(requester));
            if (teamCandidates.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "No eligible people for that team");
            }
        }

        if (projects.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No eligible projects available");
        }

        int index = ThreadLocalRandom.current().nextInt(projects.size());
        Project chosen = projects.get(index);
        log.debug(
            "Random project selected projectId={}, teamId={}, candidateCount={}",
            chosen.getId(),
            teamId,
            projects.size()
        );
        return toResponse(chosen);
    }

    public RandomAssignResponse randomAssign(String projectId, User requester, String teamId) {
        Project project = getByIdForUser(projectId, requester);
        if (!isRandomEligibleProject(project)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Project is not eligible for random assignment");
        }
        boolean isAdmin = accessPolicy.isAdmin(requester);
        List<User> candidates = userService.findAssignableUsers(null, teamId, isAdmin).stream()
            .filter(user -> user.getId() != null)
            .filter(user -> project.getMemberIds() == null || !project.getMemberIds().contains(user.getId()))
            .toList();
        if (candidates.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No eligible people available to assign");
        }

        Map<String, Long> activeCounts = userService.findActiveProjectCounts(candidates, isAdmin);
        long minCount = candidates.stream()
            .mapToLong(user -> activeCounts.getOrDefault(user.getId(), 0L))
            .min()
            .orElse(0L);
        List<User> minimalCandidates = candidates.stream()
            .filter(user -> activeCounts.getOrDefault(user.getId(), 0L) == minCount)
            .toList();
        User chosen = minimalCandidates.get(ThreadLocalRandom.current().nextInt(minimalCandidates.size()));

        List<String> previousMemberIds = project.getMemberIds() != null
            ? new ArrayList<>(project.getMemberIds())
            : List.of();
        List<String> nextMemberIds = project.getMemberIds() != null
            ? new ArrayList<>(project.getMemberIds())
            : new ArrayList<>();
        if (!nextMemberIds.contains(chosen.getId())) {
            nextMemberIds.add(chosen.getId());
        }
        project.setMemberIds(nextMemberIds);
        project.setUpdatedAt(Instant.now());

        Project saved = projectRepository.save(project);
        publishAssignmentEvents(saved, previousMemberIds, requester.getId());
        log.debug(
            "Random assign projectId={}, assignedUserId={}, teamId={}, minCount={}, minimalPool={}",
            saved.getId(),
            chosen.getId(),
            teamId,
            minCount,
            minimalCandidates.size()
        );
        ProjectResponse response = toResponse(saved);
        UserSummaryResponse assignedPerson = toUserSummary(chosen, activeCounts.getOrDefault(chosen.getId(), 0L), requester);
        return new RandomAssignResponse(response, assignedPerson);
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
        String userId = requester.getId();
        List<Project> projects = projectRepository.findByMemberIdsContaining(userId);

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

        String createdByUserId = project.getCreatedByUserId();
        String createdByTeam = project.getCreatedByTeam();
        String createdByName = null;
        if (createdByUserId != null) {
            createdByName = userRepository.findById(createdByUserId)
                .map(User::getDisplayName)
                .orElse(null);
        }

        return new ProjectResponse(
            project.getId(),
            project.getName(),
            project.getDescription(),
            project.getStatus(),
            project.getMemberIds(),
            commentResponses,
            project.getCreatedAt(),
            project.getUpdatedAt(),
            createdByUserId,
            createdByName,
            createdByTeam
        );
    }

    private Project getByIdOrThrow(String id) {
        return projectRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }

    private Project getByIdForUser(String id, User requester) {
        Project project = getByIdOrThrow(id);
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

    private boolean isRandomEligibleProject(Project project) {
        ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
        return status != ProjectStatus.ARCHIVED && status != ProjectStatus.CANCELED;
    }

    private UserSummaryResponse toUserSummary(User user, long activeProjectCount, User requester) {
        boolean recommendedByMe = requester.getId() != null
            && user.getRecommendedByUserIds() != null
            && user.getRecommendedByUserIds().contains(requester.getId());
        return new UserSummaryResponse(
            user.getId(),
            user.getDisplayName(),
            user.getEmail(),
            user.getTeam(),
            userService.isAdminTeam(user),
            activeProjectCount,
            user.getRecommendedCount(),
            recommendedByMe
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

}
