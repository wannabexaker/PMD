package com.pmd.team.service;

import com.pmd.team.dto.TeamRequest;
import com.pmd.team.model.Team;
import com.pmd.team.repository.TeamRepository;
import com.pmd.user.model.User;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TeamService {

    private static final Pattern NON_ALNUM = Pattern.compile("[^a-z0-9]+");
    private static final Pattern TRIM_DASH = Pattern.compile("(^-+|-+$)");

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    public List<Team> findActiveTeams() {
        return teamRepository.findByIsActiveTrue(Sort.by(Sort.Direction.ASC, "name"));
    }

    public Optional<Team> findById(String id) {
        return teamRepository.findById(id);
    }

    public Optional<Team> findBySlug(String slug) {
        return teamRepository.findBySlug(slug);
    }

    public Team requireActiveTeam(String id) {
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        if (!team.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Team is inactive");
        }
        return team;
    }

    public Team createTeam(TeamRequest request, User creator) {
        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Team name is required");
        }
        if (teamRepository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Team name already exists");
        }
        String slug = slugify(name);
        if (slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid team name");
        }
        if (teamRepository.existsBySlug(slug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Team slug already exists");
        }
        Team team = new Team();
        team.setName(name);
        team.setSlug(slug);
        team.setActive(true);
        team.setCreatedAt(Instant.now());
        team.setCreatedBy(creator != null ? creator.getId() : null);
        return teamRepository.save(team);
    }

    public Team updateTeam(String id, String name, Boolean isActive) {
        Team team = teamRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        if (name != null) {
            String trimmed = name.trim();
            if (trimmed.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Team name is required");
            }
            if (!trimmed.equalsIgnoreCase(team.getName()) && teamRepository.existsByNameIgnoreCase(trimmed)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Team name already exists");
            }
            String slug = slugify(trimmed);
            if (!slug.equals(team.getSlug()) && teamRepository.existsBySlug(slug)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Team slug already exists");
            }
            team.setName(trimmed);
            team.setSlug(slug);
        }
        if (isActive != null) {
            team.setActive(isActive);
        }
        return teamRepository.save(team);
    }

    public String slugify(String input) {
        if (input == null) {
            return "";
        }
        String lower = input.trim().toLowerCase(Locale.ROOT);
        String dashed = NON_ALNUM.matcher(lower).replaceAll("-");
        return TRIM_DASH.matcher(dashed).replaceAll("");
    }
}
