package com.pmd.team.service;

import com.pmd.team.model.Team;
import com.pmd.team.repository.TeamRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.util.StartupMongoRetry;
import java.time.Instant;
import java.util.ArrayList;
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
public class TeamSeeder implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(TeamSeeder.class);

    private static final List<String> DEFAULT_TEAMS = List.of(
        "Web Development",
        "Software Engineering",
        "Network Engineering",
        "Cybersecurity",
        "DevOps",
        "QA / Testing",
        "Data Engineering",
        "Project Management",
        "UX / UI Design",
        "IT Support / Helpdesk"
    );

    private final TeamRepository teamRepository;
    private final TeamService teamService;
    private final UserRepository userRepository;

    public TeamSeeder(TeamRepository teamRepository, TeamService teamService, UserRepository userRepository) {
        this.teamRepository = teamRepository;
        this.teamService = teamService;
        this.userRepository = userRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        StartupMongoRetry.runWithRetry(logger, "team seed", () -> {
            List<Team> existingTeams = teamRepository.findAll();
            Map<String, Team> teamsBySlug = existingTeams.stream()
                .filter(team -> team.getSlug() != null)
                .collect(Collectors.toMap(
                    team -> team.getSlug().toLowerCase(Locale.ROOT),
                    Function.identity(),
                    (a, b) -> a
                ));
            Map<String, Team> teamsByName = existingTeams.stream()
                .filter(team -> team.getName() != null)
                .collect(Collectors.toMap(
                    team -> team.getName().toLowerCase(Locale.ROOT),
                    Function.identity(),
                    (a, b) -> a
                ));
            String createdBy = userRepository.findAll().stream()
                .filter(User::isAdmin)
                .map(User::getId)
                .findFirst()
                .orElse(null);
            Instant now = Instant.now();
            List<Team> teams = new ArrayList<>();
            for (String name : DEFAULT_TEAMS) {
                if (name == null || name.isBlank()) {
                    continue;
                }
                String trimmed = name.trim();
                String slug = teamService.slugify(trimmed);
                if (teamsBySlug.containsKey(slug.toLowerCase(Locale.ROOT))
                    || teamsByName.containsKey(trimmed.toLowerCase(Locale.ROOT))) {
                    continue;
                }
                Team team = new Team();
                team.setName(trimmed);
                team.setSlug(slug);
                team.setActive(true);
                team.setCreatedAt(now);
                team.setCreatedBy(createdBy);
                teams.add(team);
            }
            if (!teams.isEmpty()) {
                teamRepository.saveAll(teams);
                logger.info("Seeded {} default teams.", teams.size());
            }
        });
    }
}
