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
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");
    private static final String DEFAULT_TEAM_COLOR = "#3B82F6";

    private final TeamRepository teamRepository;

    public TeamService(TeamRepository teamRepository) {
        this.teamRepository = teamRepository;
    }

    public List<Team> findActiveTeams(String workspaceId) {
        return teamRepository.findByWorkspaceIdAndIsActiveTrue(workspaceId, Sort.by(Sort.Direction.ASC, "name"));
    }

    public Optional<Team> findById(String workspaceId, String id) {
        return teamRepository.findByIdAndWorkspaceId(id, workspaceId);
    }

    public Optional<Team> findBySlug(String workspaceId, String slug) {
        return teamRepository.findBySlugAndWorkspaceId(slug, workspaceId);
    }

    public Team requireActiveTeam(String workspaceId, String id) {
        Team team = teamRepository.findByIdAndWorkspaceId(id, workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        if (!team.isActive()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "Team is inactive");
        }
        return team;
    }

    public Team createTeam(TeamRequest request, User creator, String workspaceId) {
        String name = request.getName() != null ? request.getName().trim() : "";
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Team name is required");
        }
        if (teamRepository.existsByNameIgnoreCaseAndWorkspaceId(name, workspaceId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Team name already exists");
        }
        String slug = slugify(name);
        if (slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid team name");
        }
        if (teamRepository.existsBySlugAndWorkspaceId(slug, workspaceId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Team slug already exists");
        }
        Team team = new Team();
        team.setName(name);
        team.setSlug(slug);
        team.setColor(normalizeColor(request.getColor(), DEFAULT_TEAM_COLOR));
        team.setWorkspaceId(workspaceId);
        team.setActive(true);
        team.setCreatedAt(Instant.now());
        team.setCreatedBy(creator != null ? creator.getId() : null);
        return teamRepository.save(team);
    }

    public Team updateTeam(String workspaceId, String id, String name, Boolean isActive, String color) {
        Team team = teamRepository.findByIdAndWorkspaceId(id, workspaceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Team not found"));
        if (name != null) {
            String trimmed = name.trim();
            if (trimmed.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Team name is required");
            }
            if (!trimmed.equalsIgnoreCase(team.getName())
                && teamRepository.existsByNameIgnoreCaseAndWorkspaceId(trimmed, workspaceId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Team name already exists");
            }
            String slug = slugify(trimmed);
            if (!slug.equals(team.getSlug()) && teamRepository.existsBySlugAndWorkspaceId(slug, workspaceId)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Team slug already exists");
            }
            team.setName(trimmed);
            team.setSlug(slug);
        }
        if (isActive != null) {
            team.setActive(isActive);
        }
        if (color != null) {
            team.setColor(normalizeColor(color, team.getColor() == null ? DEFAULT_TEAM_COLOR : team.getColor()));
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

    private String normalizeColor(String rawColor, String fallback) {
        if (rawColor == null || rawColor.isBlank()) {
            return fallback;
        }
        String trimmed = rawColor.trim();
        if (!HEX_COLOR.matcher(trimmed).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid team color");
        }
        return trimmed.toUpperCase(Locale.ROOT);
    }
}
