package com.pmd.project.service;

import com.pmd.project.model.Project;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.team.model.Team;
import com.pmd.team.service.TeamService;
import com.pmd.user.repository.UserRepository;
import com.pmd.util.StartupMongoRetry;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class ProjectAuthorBackfillRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(ProjectAuthorBackfillRunner.class);

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TeamService teamService;

    public ProjectAuthorBackfillRunner(ProjectRepository projectRepository,
                                       UserRepository userRepository,
                                       TeamService teamService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.teamService = teamService;
    }

    @Override
    public void run(ApplicationArguments args) {
        StartupMongoRetry.runWithRetry(logger, "project author/team backfill", () -> {
            List<Project> missingAuthor = projectRepository.findByCreatedByUserIdIsNull();
            List<Project> missingTeam = projectRepository.findByCreatedByTeamIsNull();
            List<Project> missingTeamId = projectRepository.findByTeamIdIsNull();
            if (missingAuthor.isEmpty() && missingTeam.isEmpty() && missingTeamId.isEmpty()) {
                return;
            }

            List<User> admins = userRepository.findAll().stream()
                .filter(User::isAdmin)
                .toList();
            String fallbackAdminId = admins.isEmpty() ? null : admins.get(0).getId();
            String fallbackAdminTeam = admins.isEmpty() ? null : admins.get(0).getTeam();
            String fallbackAdminTeamId = admins.isEmpty() ? null : admins.get(0).getTeamId();

            if (fallbackAdminId == null && !missingAuthor.isEmpty()) {
                // TODO: Set createdByUserId once an admin account is seeded.
                logger.warn("Projects missing createdByUserId and no admin user found; leaving unchanged.");
            } else {
                for (Project project : missingAuthor) {
                    project.setCreatedByUserId(fallbackAdminId);
                    project.setCreatedByTeam(fallbackAdminTeam);
                    project.setTeamId(fallbackAdminTeamId);
                    if (project.getCreatedAt() == null) {
                        project.setCreatedAt(Instant.now());
                    }
                }
            }

            for (Project project : missingTeam) {
                if (project.getCreatedByTeam() != null) {
                    continue;
                }
                String authorId = project.getCreatedByUserId();
                if (authorId != null) {
                    User author = userRepository.findById(authorId).orElse(null);
                    project.setCreatedByTeam(author != null ? author.getTeam() : fallbackAdminTeam);
                } else if (fallbackAdminTeam != null) {
                    project.setCreatedByTeam(fallbackAdminTeam);
                }
                if (project.getCreatedAt() == null) {
                    project.setCreatedAt(Instant.now());
                }
            }

            for (Project project : missingTeamId) {
                if (project.getTeamId() != null) {
                    continue;
                }
                String authorId = project.getCreatedByUserId();
                if (authorId != null) {
                    User author = userRepository.findById(authorId).orElse(null);
                    if (author != null && author.getTeamId() != null) {
                        project.setTeamId(author.getTeamId());
                    }
                }
                if (project.getTeamId() == null && project.getCreatedByTeam() != null) {
                    String slug = teamService.slugify(project.getCreatedByTeam());
                    Team team = teamService.findBySlug(slug).orElse(null);
                    if (team != null) {
                        project.setTeamId(team.getId());
                    }
                }
                if (project.getTeamId() == null && fallbackAdminTeamId != null) {
                    project.setTeamId(fallbackAdminTeamId);
                }
                if (project.getCreatedAt() == null) {
                    project.setCreatedAt(Instant.now());
                }
            }

            projectRepository.saveAll(missingAuthor);
            projectRepository.saveAll(missingTeam);
            projectRepository.saveAll(missingTeamId);
            logger.info("Backfilled project author/team for {} projects",
                missingAuthor.size() + missingTeam.size() + missingTeamId.size());
        });
    }
}
