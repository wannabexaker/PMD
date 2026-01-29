package com.pmd.stats.service;

import com.pmd.auth.policy.AccessPolicy;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.team.model.Team;
import com.pmd.team.service.TeamService;
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
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Service
public class StatsService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final AccessPolicy accessPolicy;
    private final TeamService teamService;

    public StatsService(ProjectRepository projectRepository, UserRepository userRepository,
                        AccessPolicy accessPolicy, TeamService teamService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.accessPolicy = accessPolicy;
        this.teamService = teamService;
    }

    public WorkspaceDashboardStatsResponse getWorkspaceDashboardStats(User requester, List<String> teamFilters,
                                                                      boolean assignedToMe) {
        boolean isAdmin = accessPolicy.isAdmin(requester);
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
        List<User> visibleUsers = isAdmin ? userRepository.findAll() : userRepository.findByIsAdminFalse();
        Map<String, String> userTeams = new HashMap<>();
        Map<String, String> teamLabels = new HashMap<>();
        List<Team> activeTeams = teamService.findActiveTeams();
        for (Team team : activeTeams) {
            if (team.getId() != null) {
                teamLabels.put(team.getId(), team.getName());
            }
        }
        for (User user : visibleUsers) {
            if (user.getId() == null) {
                continue;
            }
            String teamId = user.getTeamId();
            if (teamId == null || teamId.isBlank()) {
                continue;
            }
            userTeams.put(user.getId(), teamId);
        }

        List<String> availableTeams = activeTeams.stream()
            .map(Team::getId)
            .filter(Objects::nonNull)
            .toList();

        if (assignedToMe) {
            projects = projects.stream()
                .filter(project -> project.getMemberIds() != null && project.getMemberIds().contains(requester.getId()))
                .toList();
        }

        Set<String> selectedTeams = normalizeTeams(teamFilters);

        List<Project> scopedProjects = filterProjectsByTeams(projects, selectedTeams);

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
        List<StatSlice> projectsByTeam = buildProjectsByTeam(scopedProjects, selectedTeams, teamLabels);
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
        List<User> visibleUsers = isAdmin ? userRepository.findAll() : userRepository.findByIsAdminFalse();
        Map<String, String> teamLabels = new HashMap<>();
        Map<String, String> userTeams = new HashMap<>();
        for (Team team : teamService.findActiveTeams()) {
            if (team.getId() != null) {
                teamLabels.put(team.getId(), team.getName());
            }
        }
        for (User user : visibleUsers) {
            if (user.getId() == null) {
                continue;
            }
            String teamId = user.getTeamId();
            if (teamId == null || teamId.isBlank()) {
                continue;
            }
            userTeams.put(user.getId(), teamId);
        }

        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));

        Map<String, Long> peopleCounts = new HashMap<>();
        for (User user : visibleUsers) {
            String teamId = user.getTeamId();
            if (teamId == null || teamId.isBlank()) {
                continue;
            }
            peopleCounts.put(teamId, peopleCounts.getOrDefault(teamId, 0L) + 1);
        }

        Map<String, Long> activeAssignments = new HashMap<>();
        for (Project project : projects) {
            ProjectStatus status = project.getStatus() != null ? project.getStatus() : ProjectStatus.NOT_STARTED;
            if (status != ProjectStatus.NOT_STARTED && status != ProjectStatus.IN_PROGRESS) {
                continue;
            }
            for (String memberId : project.getMemberIds() != null ? project.getMemberIds() : List.<String>of()) {
                String teamId = userTeams.get(memberId);
                if (teamId == null) {
                    continue;
                }
                activeAssignments.put(teamId, activeAssignments.getOrDefault(teamId, 0L) + 1);
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
        String teamId = target.getTeamId();
        if (teamId == null || teamId.isBlank()) {
            return null;
        }
        List<User> teamUsers = userRepository.findByTeamId(teamId);
        List<String> teamUserIds = teamUsers.stream()
            .map(User::getId)
            .filter(Objects::nonNull)
            .toList();
        if (teamUserIds.isEmpty()) {
            return null;
        }
        List<Project> projects = projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"));
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

    private List<Project> filterProjectsByTeams(List<Project> projects, Set<String> selectedTeams) {
        if (selectedTeams.isEmpty()) {
            return projects;
        }
        return projects.stream()
            .filter(project -> project.getTeamId() != null && selectedTeams.contains(project.getTeamId()))
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
                                                Map<String, String> teamLabels) {
        Map<String, Long> counts = new HashMap<>();
        for (Project project : projects) {
            String teamId = project.getTeamId();
            if (teamId == null) {
                continue;
            }
            if (!selectedTeams.isEmpty() && !selectedTeams.contains(teamId)) {
                continue;
            }
            counts.put(teamId, counts.getOrDefault(teamId, 0L) + 1);
        }
        return counts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
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
                String teamId = userTeams.get(memberId);
                if (teamId == null) {
                    continue;
                }
                if (!selectedTeams.isEmpty() && !selectedTeams.contains(teamId)) {
                    continue;
                }
                counts.put(teamId, counts.getOrDefault(teamId, 0L) + 1);
            }
        }
        return counts.entrySet().stream()
            .sorted(Map.Entry.comparingByKey())
            .map(entry -> new StatSlice(resolveTeamLabel(entry.getKey(), teamLabels), entry.getValue()))
            .toList();
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
                    String clean = part.trim();
                    if (!clean.isEmpty()) {
                        normalized.add(clean);
                    }
                }
            } else {
                normalized.add(value);
            }
        }
        return normalized;
    }

    private String resolveTeamLabel(String normalized, Map<String, String> labels) {
        String label = labels.get(normalized);
        if (label != null && !label.isBlank()) {
            return label;
        }
        return normalized;
    }

    private String normalizeTeam(String team) {
        if (team == null) {
            return "";
        }
        return team.trim();
    }
}
