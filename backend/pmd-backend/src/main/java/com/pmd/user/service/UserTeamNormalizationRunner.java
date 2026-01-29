package com.pmd.user.service;

import com.pmd.user.model.User;
import com.pmd.team.model.Team;
import com.pmd.team.repository.TeamRepository;
import com.pmd.team.service.TeamService;
import com.pmd.user.repository.UserRepository;
import com.pmd.util.StartupMongoRetry;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class UserTeamNormalizationRunner implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(UserTeamNormalizationRunner.class);

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamService teamService;

    public UserTeamNormalizationRunner(UserRepository userRepository,
                                       TeamRepository teamRepository,
                                       TeamService teamService) {
        this.userRepository = userRepository;
        this.teamRepository = teamRepository;
        this.teamService = teamService;
    }

    @Override
    public void run(ApplicationArguments args) {
        StartupMongoRetry.runWithRetry(logger, "user team normalization", () -> {
            List<User> users = userRepository.findAll();
            List<Team> allTeams = teamRepository.findAll();
            Map<String, Team> teamsByName = allTeams.stream()
                .collect(Collectors.toMap(
                    team -> team.getName().toLowerCase(Locale.ROOT),
                    Function.identity(),
                    (a, b) -> a
                ));
            Map<String, Team> teamsBySlug = allTeams.stream()
                .collect(Collectors.toMap(
                    team -> team.getSlug().toLowerCase(Locale.ROOT),
                    Function.identity(),
                    (a, b) -> a
                ));
            boolean updated = false;
            for (User user : users) {
                String team = user.getTeam();
                if (team != null && (team.equalsIgnoreCase("admin") || team.equalsIgnoreCase("admins"))) {
                    if (!user.isAdmin()) {
                        user.setAdmin(true);
                        updated = true;
                    }
                    continue;
                }
                if ((team == null || team.isBlank()) && user.getTeamId() != null) {
                    Team existing = allTeams.stream()
                        .filter(candidate -> user.getTeamId().equals(candidate.getId()))
                        .findFirst()
                        .orElse(null);
                    if (existing != null) {
                        user.setTeam(existing.getName());
                        updated = true;
                    }
                }
                if (user.getTeamId() == null && team != null && !team.isBlank()) {
                    String key = team.trim().toLowerCase(Locale.ROOT);
                    Team resolved = teamsByName.get(key);
                    if (resolved == null) {
                        String slug = teamService.slugify(team);
                        resolved = teamsBySlug.get(slug.toLowerCase(Locale.ROOT));
                    }
                    if (resolved != null) {
                        user.setTeamId(resolved.getId());
                        updated = true;
                    }
                }
            }
            if (updated) {
                userRepository.saveAll(users);
                logger.info("Normalized user team/admin values for existing users.");
            }
        });
    }
}
