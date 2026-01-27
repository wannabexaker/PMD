package com.pmd.stats.service;

import com.pmd.auth.policy.AccessPolicy;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.stats.dto.DashboardCounters;
import com.pmd.stats.dto.PeopleOverviewStatsResponse;
import com.pmd.stats.dto.PeopleUserStatsResponse;
import com.pmd.stats.dto.StatSlice;
import com.pmd.stats.dto.UserStatsResponse;
import com.pmd.stats.dto.WorkspaceDashboardStatsResponse;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class StatsService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AccessPolicy accessPolicy;

    public StatsService(ProjectRepository projectRepository, UserRepository userRepository, AccessPolicy accessPolicy) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.accessPolicy = accessPolicy;
    }

    public WorkspaceDashboardStatsResponse getWorkspaceDashboardStats(User requester, List<String> teamFilters,
                                                                      boolean assignedToMe) {
        boolean isAdmin = accessPolicy.isAdmin(requester);
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (!isAdmin) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }

        List<User> visibleUsers = isAdmin ? userRepository.findAll() : userRepository.findByTeamNot("admin");
        Map<String, String> userTeams = new HashMap<>();
        Map<String, String> teamLabels = new HashMap<>();
        for (User user : visibleUsers) {
            if (user.getId() == null) {
                continue;
            }
            String team = normalizeTeam(user.getTeam());
            if (team == null) {
                continue;
            }
            userTeams.put(user.getId(), team);
            teamLabels.putIfAbsent(team, user.getTeam());
        }

        List<String> availableTeams = visibleUsers.stream()
            .map(User::getTeam)
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(team -> !team.isEmpty())
            .distinct()
            .sorted(String.CASE_INSENSITIVE_ORDER)
            .toList();

        if (assignedToMe) {
            projects = projects.stream()
                .filter(project -> project.getMemberIds() != null && project.getMemberIds().contains(requester.getId()))
                .toList();
        }

        Set<String> selectedTeams = normalizeTeams(teamFilters);

        List<Project> scopedProjects = filterProjectsByTeams(projects, selectedTeams, userTeams);

        long assignedCount = scopedProjects.stream()
            .filter(project -> project.getMemberIds() != null && !project.getMemberIds().isEmpty())
            .count();
        long inProgressCount = scopedProjects.stream()
            .filter(project -> (project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED)
                == ProjectStatus.IN_PROGRESS)
            .count();
        long completedCount = scopedProjects.stream()
            .filter(project -> (project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED)
                == ProjectStatus.COMPLETED)
            .count();

        List<StatSlice> statusBreakdown = buildStatusBreakdown(scopedProjects);
        List<StatSlice> projectsByTeam = buildProjectsByTeam(scopedProjects, selectedTeams, userTeams, teamLabels);
        List<StatSlice> workloadByTeam = buildWorkloadByTeam(scopedProjects, selectedTeams, userTeams, teamLabels);

        WorkspaceDashboardStatsResponse.DashboardPies pies =
            new WorkspaceDashboardStatsResponse.DashboardPies(statusBreakdown, projectsByTeam, workloadByTeam);
        WorkspaceDashboardStatsResponse.StatsScope scope =
            new WorkspaceDashboardStatsResponse.StatsScope(
                availableTeams,
                normalizeTeamsOriginal(teamFilters, availableTeams),
                assignedToMe
            );

        return new WorkspaceDashboardStatsResponse(
            new DashboardCounters(assignedCount, inProgressCount, completedCount),
            pies,
            scope
        );
    }

    public UserStatsResponse getUserStats(User requester, User target) {
        accessPolicy.assertCanViewUser(requester, target);
        List<Project> projects = projectRepository.findByMemberIdsContaining(target.getId());
        if (!accessPolicy.isAdmin(requester)) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }

        List<StatSlice> statusBreakdown = buildStatusBreakdown(projects);
        List<StatSlice> activeInactiveBreakdown = buildActiveInactiveBreakdown(projects);

        UserStatsResponse.TeamAverages teamAverages = buildTeamAverages(requester, target);

        return new UserStatsResponse(
            target.getId(),
            statusBreakdown,
            activeInactiveBreakdown,
            0,
            0,
            teamAverages
        );
    }

    public PeopleOverviewStatsResponse getPeopleOverview(User requester) {
        boolean isAdmin = accessPolicy.isAdmin(requester);
        List<User> visibleUsers = isAdmin ? userRepository.findAll() : userRepository.findByTeamNot("admin");
        Map<String, String> teamLabels = new HashMap<>();
        Map<String, String> userTeams = new HashMap<>();
        for (User user : visibleUsers) {
            if (user.getId() == null) {
                continue;
            }
            String normalized = normalizeTeam(user.getTeam());
            if (normalized == null) {
                continue;
            }
            userTeams.put(user.getId(), normalized);
            teamLabels.putIfAbsent(normalized, user.getTeam());
        }

        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (!isAdmin) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }

        Map<String, Long> peopleCounts = new HashMap<>();
        for (User user : visibleUsers) {
            String team = normalizeTeam(user.getTeam());
            if (team == null) {
                continue;
            }
            peopleCounts.put(team, peopleCounts.getOrDefault(team, 0L) + 1);
        }

        Map<String, Long> activeAssignments = new HashMap<>();
        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            if (status != ProjectStatus.NOT_STARTED && status != ProjectStatus.IN_PROGRESS) {
                continue;
            }
            for (String memberId : project.getMemberIds() != null ? project.getMemberIds() : List.<String>of()) {
                String team = userTeams.get(memberId);
                if (team == null) {
                    continue;
                }
                activeAssignments.put(team, activeAssignments.getOrDefault(team, 0L) + 1);
            }
        }

        List<StatSlice> peopleByTeam = peopleCounts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
            .map(entry -> new StatSlice(resolveTeamLabel(entry.getKey(), teamLabels), entry.getValue()))
            .toList();
        List<StatSlice> workloadByTeam = activeAssignments.entrySet().stream()
            .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
            .map(entry -> new StatSlice(resolveTeamLabel(entry.getKey(), teamLabels), entry.getValue()))
            .toList();
        PeopleOverviewStatsResponse.PeopleOverviewPies pies =
            new PeopleOverviewStatsResponse.PeopleOverviewPies(peopleByTeam, workloadByTeam);
        return new PeopleOverviewStatsResponse(pies);
    }

    public PeopleUserStatsResponse getPeopleUserStats(User requester, User target) {
        accessPolicy.assertCanViewUser(requester, target);
        List<Project> projects = projectRepository.findByMemberIdsContaining(target.getId());
        if (!accessPolicy.isAdmin(requester)) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }
        List<StatSlice> statusBreakdown = buildStatusBreakdown(projects);
        List<StatSlice> activeInactiveBreakdown = buildActiveInactiveBreakdown(projects);

        PeopleUserStatsResponse.PeopleUserPies pies =
            new PeopleUserStatsResponse.PeopleUserPies(statusBreakdown, activeInactiveBreakdown);

        return new PeopleUserStatsResponse(target.getId(), pies);
    }

    private List<String> normalizeTeamsOriginal(List<String> rawTeams, List<String> availableTeams) {
        Set<String> normalized = normalizeTeams(rawTeams);
        if (normalized.isEmpty()) {
            return availableTeams;
        }
        return availableTeams.stream()
            .filter(team -> normalized.contains(normalizeTeam(team)))
            .toList();
    }

    private UserStatsResponse.TeamAverages buildTeamAverages(User requester, User target) {
        String team = normalizeTeam(target.getTeam());
        if (team == null) {
            return null;
        }
        List<User> teamUsers = userRepository.findByTeam(target.getTeam());
        List<String> teamUserIds = teamUsers.stream()
            .map(User::getId)
            .filter(Objects::nonNull)
            .toList();
        if (teamUserIds.isEmpty()) {
            return null;
        }
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        if (!accessPolicy.isAdmin(requester)) {
            Map<String, Boolean> authorAdminFlags = loadAuthorAdminFlags(projects);
            projects = projects.stream()
                .filter(project -> isVisibleToNonAdmin(project, authorAdminFlags))
                .toList();
        }
        Map<String, Long> activeAssignmentsByUser = new HashMap<>();
        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            if (status != ProjectStatus.NOT_STARTED && status != ProjectStatus.IN_PROGRESS) {
                continue;
            }
            for (String memberId : project.getMemberIds() != null ? project.getMemberIds() : List.<String>of()) {
                if (!teamUserIds.contains(memberId)) {
                    continue;
                }
                activeAssignmentsByUser.put(memberId, activeAssignmentsByUser.getOrDefault(memberId, 0L) + 1);
            }
        }
        double average = activeAssignmentsByUser.values().stream()
            .mapToLong(Long::longValue)
            .average()
            .orElse(0);
        return new UserStatsResponse.TeamAverages(average);
    }

    private List<Project> filterProjectsByTeams(List<Project> projects, Set<String> selectedTeams,
                                                 Map<String, String> userTeams) {
        if (selectedTeams.isEmpty()) {
            return projects;
        }
        return projects.stream()
            .filter(project -> {
                List<String> members = project.getMemberIds();
                if (members == null || members.isEmpty()) {
                    return false;
                }
                for (String memberId : members) {
                    String team = userTeams.get(memberId);
                    if (team != null && selectedTeams.contains(team)) {
                        return true;
                    }
                }
                return false;
            })
            .toList();
    }

    private List<StatSlice> buildStatusBreakdown(List<Project> projects) {
        Map<ProjectStatus, Long> statusCounts = new EnumMap<>(ProjectStatus.class);
        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            statusCounts.put(status, statusCounts.getOrDefault(status, 0L) + 1);
        }
        List<StatSlice> slices = new ArrayList<>();
        slices.add(new StatSlice("Not started", statusCounts.getOrDefault(ProjectStatus.NOT_STARTED, 0L)));
        slices.add(new StatSlice("In progress", statusCounts.getOrDefault(ProjectStatus.IN_PROGRESS, 0L)));
        slices.add(new StatSlice("Completed", statusCounts.getOrDefault(ProjectStatus.COMPLETED, 0L)));
        slices.add(new StatSlice("Canceled", statusCounts.getOrDefault(ProjectStatus.CANCELED, 0L)));
        if (statusCounts.containsKey(ProjectStatus.ARCHIVED)) {
            slices.add(new StatSlice("Archived", statusCounts.getOrDefault(ProjectStatus.ARCHIVED, 0L)));
        }
        return slices;
    }

    private List<StatSlice> buildActiveInactiveBreakdown(List<Project> projects) {
        long activeCount = 0;
        long inactiveCount = 0;
        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            if (status == ProjectStatus.NOT_STARTED || status == ProjectStatus.IN_PROGRESS) {
                activeCount += 1;
            } else {
                inactiveCount += 1;
            }
        }
        return List.of(new StatSlice("Active", activeCount), new StatSlice("Inactive", inactiveCount));
    }

    private List<StatSlice> buildProjectsByTeam(List<Project> projects, Set<String> selectedTeams,
                                                Map<String, String> userTeams, Map<String, String> teamLabels) {
        Map<String, Long> counts = new HashMap<>();
        for (Project project : projects) {
            Set<String> projectTeams = new HashSet<>();
            for (String memberId : project.getMemberIds() != null ? project.getMemberIds() : List.<String>of()) {
                String team = userTeams.get(memberId);
                if (team != null) {
                    projectTeams.add(team);
                }
            }
            for (String team : projectTeams) {
                if (!selectedTeams.isEmpty() && !selectedTeams.contains(team)) {
                    continue;
                }
                counts.put(team, counts.getOrDefault(team, 0L) + 1);
            }
        }
        return counts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
            .map(entry -> new StatSlice(resolveTeamLabel(entry.getKey(), teamLabels), entry.getValue()))
            .toList();
    }

    private List<StatSlice> buildWorkloadByTeam(List<Project> projects, Set<String> selectedTeams,
                                                Map<String, String> userTeams, Map<String, String> teamLabels) {
        Map<String, Long> counts = new HashMap<>();
        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            if (status != ProjectStatus.NOT_STARTED && status != ProjectStatus.IN_PROGRESS) {
                continue;
            }
            for (String memberId : project.getMemberIds() != null ? project.getMemberIds() : List.<String>of()) {
                String team = userTeams.get(memberId);
                if (team == null) {
                    continue;
                }
                if (!selectedTeams.isEmpty() && !selectedTeams.contains(team)) {
                    continue;
                }
                counts.put(team, counts.getOrDefault(team, 0L) + 1);
            }
        }
        return counts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey(String.CASE_INSENSITIVE_ORDER))
            .map(entry -> new StatSlice(resolveTeamLabel(entry.getKey(), teamLabels), entry.getValue()))
            .toList();
    }

    private boolean isVisibleToNonAdmin(Project project, Map<String, Boolean> authorAdminFlags) {
        String authorId = project.getCreatedByUserId();
        if (authorId == null) {
            return true;
        }
        Boolean isAdminAuthor = authorAdminFlags.get(authorId);
        return isAdminAuthor == null || !isAdminAuthor;
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

    private Set<String> normalizeTeams(List<String> teams) {
        if (teams == null || teams.isEmpty()) {
            return Set.of();
        }
        Set<String> normalized = new HashSet<>();
        for (String team : teams) {
            if (team == null) {
                continue;
            }
            String value = team.trim();
            if (value.isEmpty()) {
                continue;
            }
            if (value.contains(",")) {
                for (String part : value.split(",")) {
                    String clean = normalizeTeam(part);
                    if (clean != null) {
                        normalized.add(clean);
                    }
                }
            } else {
                String clean = normalizeTeam(value);
                if (clean != null) {
                    normalized.add(clean);
                }
            }
        }
        return normalized;
    }

    private String normalizeTeam(String team) {
        if (team == null) {
            return null;
        }
        String cleaned = team.trim();
        if (cleaned.isEmpty()) {
            return null;
        }
        if (cleaned.equalsIgnoreCase("admin") || cleaned.equalsIgnoreCase("admins")) {
            return "admin";
        }
        return cleaned.toLowerCase(Locale.ROOT);
    }

    private String resolveTeamLabel(String normalized, Map<String, String> labels) {
        String label = labels.get(normalized);
        if (label != null && !label.isBlank()) {
            return label;
        }
        if ("admin".equals(normalized)) {
            return "Admin";
        }
        return normalized;
    }
}
