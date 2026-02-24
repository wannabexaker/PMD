package com.pmd.mention.service;

import com.pmd.mention.dto.MentionRestrictionResponse;
import com.pmd.mention.dto.MentionAuditEventResponse;
import com.pmd.mention.model.MentionAuditEvent;
import com.pmd.mention.model.MentionRestriction;
import com.pmd.mention.repository.MentionAuditEventRepository;
import com.pmd.mention.repository.MentionRestrictionRepository;
import com.pmd.user.model.User;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.mapping.Field;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class MentionPolicyService {

    private static final int MAX_TARGETS_PER_MESSAGE = 10;
    private static final int MAX_TARGETS_PER_10_MINUTES = 20;
    private static final Duration RATE_WINDOW = Duration.ofMinutes(10);
    private static final Duration EVERYONE_COOLDOWN = Duration.ofMinutes(30);
    private static final Duration AUTO_BLOCK_DURATION = Duration.ofDays(1);
    private static final int AUTO_BLOCK_THRESHOLD = 3;
    private static final Duration ABUSE_WINDOW = Duration.ofHours(24);
    private static final String OUTCOME_ALLOWED = "ALLOWED";

    private static final Pattern EMAIL_MENTION = Pattern.compile("@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})");
    private static final Pattern TEAM_MENTION = Pattern.compile("(?i)@team(mention)?\\b");
    private static final Pattern EVERYONE_MENTION = Pattern.compile("(?i)(^|\\s)@everyone\\b");
    private static final Pattern USER_TOKEN_MENTION = Pattern.compile("@([^\\r\\n{}]+)\\{user:([^}\\s]+)}");
    private static final Pattern TEAM_TOKEN_MENTION = Pattern.compile("@[^\\r\\n{}]+\\{team:([^}\\s]+)}");
    private static final Pattern ROLE_TOKEN_MENTION = Pattern.compile("@[^\\r\\n{}]+\\{role:([^}\\s]+)}");

    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final MentionAuditEventRepository mentionAuditEventRepository;
    private final MentionRestrictionRepository mentionRestrictionRepository;
    private final MongoTemplate mongoTemplate;

    public MentionPolicyService(WorkspaceMemberRepository workspaceMemberRepository,
                                MentionAuditEventRepository mentionAuditEventRepository,
                                MentionRestrictionRepository mentionRestrictionRepository,
                                MongoTemplate mongoTemplate) {
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.mentionAuditEventRepository = mentionAuditEventRepository;
        this.mentionRestrictionRepository = mentionRestrictionRepository;
        this.mongoTemplate = mongoTemplate;
    }

    public void enforcePolicy(String workspaceId,
                              String projectId,
                              String projectTeamId,
                              User requester,
                              String message,
                              String source) {
        MentionTargets targets = MentionTargets.parse(message);
        if (targets.targetCount() == 0) {
            return;
        }
        if (workspaceId == null || workspaceId.isBlank() || requester == null || requester.getId() == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Mentions are not allowed for this request.");
        }

        WorkspaceMember requesterMembership = workspaceMemberRepository
            .findByWorkspaceIdAndUserId(workspaceId, requester.getId())
            .orElse(null);
        boolean managerOrOwner = isManagerOrOwner(requester, requesterMembership);

        MentionRestriction restriction = mentionRestrictionRepository
            .findByWorkspaceIdAndUserId(workspaceId, requester.getId())
            .orElse(null);
        Instant now = Instant.now();
        if (restriction != null && restriction.getBlockedUntil() != null && restriction.getBlockedUntil().isAfter(now)) {
            recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_RESTRICTED",
                "Mention access blocked until " + restriction.getBlockedUntil());
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Mention access blocked until " + restriction.getBlockedUntil() + "."
            );
        }

        if (targets.targetCount() > MAX_TARGETS_PER_MESSAGE) {
            blockIfAbusive(workspaceId, requester.getId(), now);
            recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_TARGET_LIMIT",
                "Too many mention targets in one message");
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Too many mentions in one message. Maximum is " + MAX_TARGETS_PER_MESSAGE + "."
            );
        }

        if (targets.mentionEveryone() && !managerOrOwner) {
            blockIfAbusive(workspaceId, requester.getId(), now);
            recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_PERMISSION",
                "@everyone is allowed only for owner/manager.");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "@everyone is allowed only for owner/manager.");
        }

        if (!targets.roleMentionIds().isEmpty() && !managerOrOwner) {
            blockIfAbusive(workspaceId, requester.getId(), now);
            recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_PERMISSION",
                "Role mentions are allowed only for owner/manager.");
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Role mentions are allowed only for owner/manager.");
        }

        if (!targets.teamMentionIds().isEmpty() && !managerOrOwner) {
            String requesterTeamId = requester.getTeamId();
            boolean hasCrossTeamMention = targets.teamMentionIds().stream().anyMatch(teamId -> !teamId.equals(requesterTeamId));
            if (hasCrossTeamMention) {
                blockIfAbusive(workspaceId, requester.getId(), now);
                recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_PERMISSION",
                    "Cross-team mentions are allowed only for owner/manager.");
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can mention only your own team unless you are owner/manager."
                );
            }
        }

        if (targets.teamKeywordMention() && !managerOrOwner) {
            if (projectTeamId == null || projectTeamId.isBlank() || requester.getTeamId() == null
                || !projectTeamId.equals(requester.getTeamId())) {
                blockIfAbusive(workspaceId, requester.getId(), now);
                recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_PERMISSION",
                    "@teammention is allowed only for owner/manager or members of project team.");
                throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "@teammention is allowed only for owner/manager or members of the project team."
                );
            }
        }

        int usedInWindow = mentionCountInWindow(workspaceId, requester.getId(), now.minus(RATE_WINDOW));
        if (usedInWindow + targets.targetCount() > MAX_TARGETS_PER_10_MINUTES) {
            blockIfAbusive(workspaceId, requester.getId(), now);
            recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_RATE_LIMIT",
                "Mention rate limit exceeded.");
            throw new ResponseStatusException(
                HttpStatus.TOO_MANY_REQUESTS,
                "Mention rate limit exceeded. Max "
                    + MAX_TARGETS_PER_10_MINUTES + " mention targets per 10 minutes."
            );
        }

        if (targets.mentionEveryone()) {
            List<MentionAuditEvent> recentEveryone = mentionAuditEventRepository
                .findByWorkspaceIdAndEveryoneMentionIsTrueAndOutcomeAndCreatedAtAfter(
                    workspaceId,
                    OUTCOME_ALLOWED,
                    now.minus(EVERYONE_COOLDOWN)
                );
            if (!recentEveryone.isEmpty()) {
                blockIfAbusive(workspaceId, requester.getId(), now);
                recordEvent(workspaceId, projectId, requester.getId(), source, targets, "BLOCKED_EVERYONE_COOLDOWN",
                    "@everyone cooldown is active for this workspace.");
                throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "@everyone can be used only once every 30 minutes per workspace."
                );
            }
        }

        recordEvent(workspaceId, projectId, requester.getId(), source, targets, OUTCOME_ALLOWED, "Allowed");
    }

    public List<MentionRestrictionResponse> listRestrictions(String workspaceId, User requester) {
        WorkspaceMember member = requireManagerOrOwner(workspaceId, requester);
        if (member == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        Instant now = Instant.now();
        return mentionRestrictionRepository.findByWorkspaceId(workspaceId).stream()
            .filter(restriction -> restriction.getBlockedUntil() != null && restriction.getBlockedUntil().isAfter(now))
            .map(restriction -> new MentionRestrictionResponse(
                restriction.getUserId(),
                restriction.getBlockedUntil(),
                restriction.getReason(),
                restriction.getUpdatedAt()
            ))
            .toList();
    }

    public void clearRestriction(String workspaceId, String userId, User requester) {
        WorkspaceMember member = requireManagerOrOwner(workspaceId, requester);
        if (member == null) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden");
        }
        MentionRestriction restriction = mentionRestrictionRepository
            .findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElse(null);
        if (restriction == null) {
            return;
        }
        restriction.setBlockedUntil(Instant.now());
        restriction.setReason("Cleared by manager/owner");
        restriction.setUpdatedByUserId(requester.getId());
        restriction.setUpdatedAt(Instant.now());
        mentionRestrictionRepository.save(restriction);
    }

    public List<MentionAuditEventResponse> listAudit(String workspaceId, String userId, User requester) {
        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requester.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden"));
        boolean managerOrOwner = isManagerOrOwner(requester, member);
        if (!managerOrOwner && userId != null && !userId.equals(requester.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner/Manager only for other users audit.");
        }
        List<MentionAuditEvent> events;
        if (userId != null && !userId.isBlank()) {
            events = mentionAuditEventRepository.findTop100ByWorkspaceIdAndActorUserIdOrderByCreatedAtDesc(workspaceId, userId);
        } else if (managerOrOwner) {
            events = mentionAuditEventRepository.findTop100ByWorkspaceIdOrderByCreatedAtDesc(workspaceId);
        } else {
            events = mentionAuditEventRepository.findTop100ByWorkspaceIdAndActorUserIdOrderByCreatedAtDesc(
                workspaceId,
                requester.getId()
            );
        }
        return events.stream()
            .map(event -> new MentionAuditEventResponse(
                event.getWorkspaceId(),
                event.getProjectId(),
                event.getActorUserId(),
                event.getSource(),
                event.getOutcome(),
                event.getDetail(),
                event.isEveryoneMention(),
                event.getMentionTargetCount(),
                event.getTargets(),
                event.getCreatedAt()
            ))
            .toList();
    }

    private WorkspaceMember requireManagerOrOwner(String workspaceId, User requester) {
        if (requester == null || requester.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        WorkspaceMember member = workspaceMemberRepository.findByWorkspaceIdAndUserId(workspaceId, requester.getId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Forbidden"));
        if (!isManagerOrOwner(requester, member)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Owner/Manager only.");
        }
        return member;
    }

    private boolean isManagerOrOwner(User requester, WorkspaceMember member) {
        if (requester != null && requester.isAdmin()) {
            return true;
        }
        WorkspaceMemberRole role = member != null ? member.getRole() : null;
        return role == WorkspaceMemberRole.OWNER || role == WorkspaceMemberRole.ADMIN;
    }

    private int mentionCountInWindow(String workspaceId, String actorUserId, Instant since) {
        Aggregation aggregation = Aggregation.newAggregation(
            Aggregation.match(
                Criteria.where("workspaceId").is(workspaceId)
                    .and("actorUserId").is(actorUserId)
                    .and("outcome").is(OUTCOME_ALLOWED)
                    .and("createdAt").gte(since)
            ),
            Aggregation.group().sum("mentionTargetCount").as("count")
        );
        AggregationResults<MentionCountAggregation> results = mongoTemplate.aggregate(
            aggregation,
            "mention_audit_events",
            MentionCountAggregation.class
        );
        MentionCountAggregation first = results.getUniqueMappedResult();
        return first == null ? 0 : first.getCount();
    }

    private long blockedAttemptsInWindow(String workspaceId, String actorUserId, Instant since) {
        return mongoTemplate.count(
            new org.springframework.data.mongodb.core.query.Query(
                Criteria.where("workspaceId").is(workspaceId)
                    .and("actorUserId").is(actorUserId)
                    .and("outcome").regex("^BLOCKED_")
                    .and("createdAt").gte(since)
            ),
            MentionAuditEvent.class
        );
    }

    private void blockIfAbusive(String workspaceId, String userId, Instant now) {
        long attempts = blockedAttemptsInWindow(workspaceId, userId, now.minus(ABUSE_WINDOW));
        if (attempts + 1 < AUTO_BLOCK_THRESHOLD) {
            return;
        }
        MentionRestriction restriction = mentionRestrictionRepository
            .findByWorkspaceIdAndUserId(workspaceId, userId)
            .orElseGet(MentionRestriction::new);
        restriction.setWorkspaceId(workspaceId);
        restriction.setUserId(userId);
        restriction.setBlockedUntil(now.plus(AUTO_BLOCK_DURATION));
        restriction.setReason("Auto mention suspension after repeated policy violations");
        restriction.setUpdatedAt(now);
        mentionRestrictionRepository.save(restriction);
    }

    private void recordEvent(String workspaceId,
                             String projectId,
                             String actorUserId,
                             String source,
                             MentionTargets targets,
                             String outcome,
                             String detail) {
        MentionAuditEvent event = new MentionAuditEvent();
        event.setWorkspaceId(workspaceId);
        event.setProjectId(projectId);
        event.setActorUserId(actorUserId);
        event.setSource(source);
        event.setCreatedAt(Instant.now());
        event.setOutcome(outcome);
        event.setDetail(detail);
        event.setEveryoneMention(targets.mentionEveryone());
        event.setMentionTargetCount(targets.targetCount());
        event.setTargets(targets.targets());
        mentionAuditEventRepository.save(event);
    }

    private static final class MentionCountAggregation {
        @Field("count")
        private int count;

        public int getCount() {
            return count;
        }
    }

    private record MentionTargets(
        Set<String> userIds,
        Set<String> emails,
        Set<String> teamMentionIds,
        Set<String> roleMentionIds,
        boolean mentionEveryone,
        boolean teamKeywordMention,
        List<String> targets
    ) {
        static MentionTargets parse(String message) {
            if (message == null || message.isBlank()) {
                return new MentionTargets(Set.of(), Set.of(), Set.of(), Set.of(), false, false, List.of());
            }
            Set<String> userIds = new LinkedHashSet<>();
            Set<String> emails = new LinkedHashSet<>();
            Set<String> teamIds = new LinkedHashSet<>();
            Set<String> roleIds = new LinkedHashSet<>();
            List<String> targets = new ArrayList<>();
            Matcher userMatcher = USER_TOKEN_MENTION.matcher(message);
            while (userMatcher.find()) {
                String id = userMatcher.group(2);
                if (id != null && !id.isBlank() && userIds.add(id.trim())) {
                    targets.add("user:" + id.trim());
                }
            }
            Matcher emailMatcher = EMAIL_MENTION.matcher(message);
            while (emailMatcher.find()) {
                String email = emailMatcher.group(1);
                if (email != null && !email.isBlank() && emails.add(email.trim().toLowerCase())) {
                    targets.add("email:" + email.trim().toLowerCase());
                }
            }
            Matcher teamMatcher = TEAM_TOKEN_MENTION.matcher(message);
            while (teamMatcher.find()) {
                String id = teamMatcher.group(1);
                if (id != null && !id.isBlank() && teamIds.add(id.trim())) {
                    targets.add("team:" + id.trim());
                }
            }
            Matcher roleMatcher = ROLE_TOKEN_MENTION.matcher(message);
            while (roleMatcher.find()) {
                String id = roleMatcher.group(1);
                if (id != null && !id.isBlank() && roleIds.add(id.trim())) {
                    targets.add("role:" + id.trim());
                }
            }
            boolean everyone = EVERYONE_MENTION.matcher(message).find();
            if (everyone) {
                targets.add("everyone");
            }
            boolean teamKeyword = TEAM_MENTION.matcher(message).find();
            if (teamKeyword && !targets.contains("teamkeyword")) {
                targets.add("teamkeyword");
            }
            return new MentionTargets(userIds, emails, teamIds, roleIds, everyone, teamKeyword, targets);
        }

        int targetCount() {
            return targets.size();
        }
    }
}
