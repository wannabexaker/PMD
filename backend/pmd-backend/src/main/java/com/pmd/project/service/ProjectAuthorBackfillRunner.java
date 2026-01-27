package com.pmd.project.service;

import com.pmd.project.model.Project;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
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

    public ProjectAuthorBackfillRunner(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        List<Project> missingAuthor = projectRepository.findByCreatedByUserIdIsNull();
        List<Project> missingTeam = projectRepository.findByCreatedByTeamIsNull();
        if (missingAuthor.isEmpty() && missingTeam.isEmpty()) {
            return;
        }

        List<User> admins = userRepository.findByTeam("admin");
        String fallbackAdminId = admins.isEmpty() ? null : admins.get(0).getId();
        String fallbackAdminTeam = admins.isEmpty() ? null : normalizeTeam(admins.get(0).getTeam());

        if (fallbackAdminId == null && !missingAuthor.isEmpty()) {
            // TODO: Set createdByUserId once an admin account is seeded.
            logger.warn("Projects missing createdByUserId and no admin user found; leaving unchanged.");
        } else {
            for (Project project : missingAuthor) {
                project.setCreatedByUserId(fallbackAdminId);
                project.setCreatedByTeam(fallbackAdminTeam);
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
                project.setCreatedByTeam(author != null ? normalizeTeam(author.getTeam()) : fallbackAdminTeam);
            } else if (fallbackAdminTeam != null) {
                project.setCreatedByTeam(fallbackAdminTeam);
            }
            if (project.getCreatedAt() == null) {
                project.setCreatedAt(Instant.now());
            }
        }

        projectRepository.saveAll(missingAuthor);
        projectRepository.saveAll(missingTeam);
        logger.info("Backfilled project author/team for {} projects", missingAuthor.size() + missingTeam.size());
    }

    private String normalizeTeam(String team) {
        if (team == null) {
            return null;
        }
        if (team.equalsIgnoreCase("admin") || team.equalsIgnoreCase("admins")) {
            return "admin";
        }
        return team;
    }
}
