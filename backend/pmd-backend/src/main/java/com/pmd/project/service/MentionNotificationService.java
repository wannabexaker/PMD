package com.pmd.project.service;

import com.pmd.notification.EmailNotificationService;
import com.pmd.project.model.Project;
import com.pmd.team.repository.TeamRepository;
import com.pmd.user.model.User;
import com.pmd.user.service.UserService;
import com.pmd.workspace.model.WorkspaceMember;
import com.pmd.workspace.repository.WorkspaceMemberRepository;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class MentionNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(MentionNotificationService.class);

    public enum MentionSource {
        COMMENT("comment"),
        PROJECT_DESCRIPTION("project description"),
        PROJECT_TITLE("project title");

        private final String label;

        MentionSource(String label) {
            this.label = label;
        }

        public String label() {
            return label;
        }
    }

    private static final Pattern EMAIL_MENTION = Pattern.compile("@([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})");
    private static final Pattern TEAM_MENTION = Pattern.compile("(?i)@team(mention)?\\b");
    private static final Pattern EVERYONE_MENTION = Pattern.compile("(?i)(^|\\s)@everyone\\b");
    private static final Pattern USER_TOKEN_MENTION = Pattern.compile("@([^\\r\\n{}]+)\\{user:([^}\\s]+)}");
    private static final Pattern TEAM_TOKEN_MENTION = Pattern.compile("@[^\\r\\n{}]+\\{team:([^}\\s]+)}");
    private static final Pattern ROLE_TOKEN_MENTION = Pattern.compile("@[^\\r\\n{}]+\\{role:([^}\\s]+)}");

    private final UserService userService;
    private final TeamRepository teamRepository;
    private final WorkspaceMemberRepository workspaceMemberRepository;
    private final EmailNotificationService emailNotificationService;

    public MentionNotificationService(UserService userService,
                                      TeamRepository teamRepository,
                                      WorkspaceMemberRepository workspaceMemberRepository,
                                      EmailNotificationService emailNotificationService) {
        this.userService = userService;
        this.teamRepository = teamRepository;
        this.workspaceMemberRepository = workspaceMemberRepository;
        this.emailNotificationService = emailNotificationService;
    }

    public void notifyMentions(String workspaceId, Project project, User requester, String message, MentionSource source) {
        if (message == null || message.isBlank()) {
            return;
        }
        Set<String> notifiedUserIds = new HashSet<>();
        List<User> workspaceUsers = userService.listUsersForWorkspace(workspaceId, true);
        Map<String, User> byId = new HashMap<>();
        Map<String, User> byEmail = new HashMap<>();
        Map<String, User> byDisplayName = new HashMap<>();
        for (User user : workspaceUsers) {
            if (user.getId() != null) {
                byId.put(user.getId(), user);
            }
            if (user.getEmail() != null) {
                byEmail.put(user.getEmail().toLowerCase(Locale.ROOT), user);
            }
            String displayName = user.getDisplayName();
            if (displayName != null && !displayName.isBlank()) {
                byDisplayName.put(displayName.trim().toLowerCase(Locale.ROOT), user);
            }
        }
        Map<String, WorkspaceMember> membersByUserId = new HashMap<>();
        for (WorkspaceMember member : workspaceMemberRepository.findByWorkspaceId(workspaceId)) {
            if (member.getUserId() != null) {
                membersByUserId.put(member.getUserId(), member);
            }
        }
        Set<String> teamMentionIds = extractMentionIds(TEAM_TOKEN_MENTION, message);
        Set<String> roleMentionIds = extractMentionIds(ROLE_TOKEN_MENTION, message);
        Map<String, String> userMentions = extractUserTokenMentions(message);
        boolean mentionEveryone = EVERYONE_MENTION.matcher(message).find();
        logger.debug(
            "Mention parsing workspaceId={}, projectId={}, source={}, userTokenMentions={}, teamTokenMentions={}, roleTokenMentions={}, mentionEveryone={}",
            workspaceId,
            project != null ? project.getId() : null,
            source != null ? source.label() : null,
            userMentions.size(),
            teamMentionIds.size(),
            roleMentionIds.size(),
            mentionEveryone
        );

        Matcher matcher = EMAIL_MENTION.matcher(message);
        while (matcher.find()) {
            String email = matcher.group(1);
            if (email == null) {
                continue;
            }
            User mentioned = byEmail.get(email.toLowerCase(Locale.ROOT));
            if (mentioned == null || mentioned.getId() == null) {
                continue;
            }
            if (notifiedUserIds.add(mentioned.getId())) {
                emailNotificationService.sendMentionUser(mentioned, project, trimSnippet(message), requester, source.label());
            }
        }

        for (Map.Entry<String, String> mention : userMentions.entrySet()) {
            String userId = mention.getKey();
            User mentioned = byId.get(userId);
            if (mentioned == null) {
                String label = mention.getValue();
                if (label != null && !label.isBlank()) {
                    mentioned = byDisplayName.get(label.trim().toLowerCase(Locale.ROOT));
                }
            }
            if (mentioned == null || mentioned.getId() == null) {
                continue;
            }
            if (notifiedUserIds.add(mentioned.getId())) {
                emailNotificationService.sendMentionUser(mentioned, project, trimSnippet(message), requester, source.label());
            }
        }

        // Plain "@Display Name" mention fallback (for manual typing without token payload).
        String loweredMessage = message.toLowerCase(Locale.ROOT);
        for (User user : workspaceUsers) {
            String displayName = user.getDisplayName();
            if (user.getId() == null || displayName == null || displayName.isBlank()) {
                continue;
            }
            String needle = "@" + displayName.trim().toLowerCase(Locale.ROOT);
            if (!loweredMessage.contains(needle)) {
                continue;
            }
            if (notifiedUserIds.add(user.getId())) {
                emailNotificationService.sendMentionUser(user, project, trimSnippet(message), requester, source.label());
            }
        }

        if (!teamMentionIds.isEmpty()) {
            Set<String> activeTeamIds = new HashSet<>();
            teamRepository.findByWorkspaceId(workspaceId).forEach(team -> {
                if (team != null && team.isActive() && team.getId() != null) {
                    activeTeamIds.add(team.getId());
                }
            });
            for (User user : workspaceUsers) {
                if (user.getId() == null || user.getTeamId() == null) {
                    continue;
                }
                if (!activeTeamIds.contains(user.getTeamId()) || !teamMentionIds.contains(user.getTeamId())) {
                    continue;
                }
                if (notifiedUserIds.add(user.getId())) {
                    emailNotificationService.sendMentionTeam(user, project, trimSnippet(message), requester, source.label());
                }
            }
        }

        if (!roleMentionIds.isEmpty()) {
            for (User user : workspaceUsers) {
                if (user.getId() == null) {
                    continue;
                }
                WorkspaceMember member = membersByUserId.get(user.getId());
                if (member == null || member.getRoleId() == null || !roleMentionIds.contains(member.getRoleId())) {
                    continue;
                }
                if (notifiedUserIds.add(user.getId())) {
                    emailNotificationService.sendMentionTeam(user, project, trimSnippet(message), requester, source.label());
                }
            }
        }

        if (mentionEveryone) {
            for (User user : workspaceUsers) {
                if (user.getId() == null) {
                    continue;
                }
                if (notifiedUserIds.add(user.getId())) {
                    emailNotificationService.sendMentionTeam(user, project, trimSnippet(message), requester, source.label());
                }
            }
        }

        if (TEAM_MENTION.matcher(message).find() && project.getTeamId() != null) {
            for (User user : workspaceUsers) {
                if (user.getId() == null || user.getTeamId() == null) {
                    continue;
                }
                if (!project.getTeamId().equals(user.getTeamId())) {
                    continue;
                }
                if (notifiedUserIds.add(user.getId())) {
                    emailNotificationService.sendMentionTeam(user, project, trimSnippet(message), requester, source.label());
                }
            }
        }

        logger.debug(
            "Mention processing completed workspaceId={}, projectId={}, source={}, notifiedRecipients={}",
            workspaceId,
            project != null ? project.getId() : null,
            source != null ? source.label() : null,
            notifiedUserIds.size()
        );
    }

    private Set<String> extractMentionIds(Pattern pattern, String message) {
        Set<String> ids = new HashSet<>();
        if (message == null || message.isBlank()) {
            return ids;
        }
        Matcher matcher = pattern.matcher(message);
        while (matcher.find()) {
            String value = matcher.group(1);
            if (value == null) {
                continue;
            }
            String normalized = value.trim();
            if (!normalized.isBlank()) {
                ids.add(normalized);
            }
        }
        return ids;
    }

    private String trimSnippet(String text) {
        if (text == null) {
            return null;
        }
        String trimmed = sanitizeMentionTokens(text).trim();
        if (trimmed.length() <= 140) {
            return trimmed;
        }
        return trimmed.substring(0, 140) + "...";
    }

    private Map<String, String> extractUserTokenMentions(String message) {
        Map<String, String> mentions = new HashMap<>();
        if (message == null || message.isBlank()) {
            return mentions;
        }
        Matcher matcher = USER_TOKEN_MENTION.matcher(message);
        while (matcher.find()) {
            String label = matcher.group(1);
            String userId = matcher.group(2);
            if (userId == null || userId.isBlank()) {
                continue;
            }
            mentions.put(userId.trim(), label == null ? "" : label.trim());
        }
        return mentions;
    }

    private String sanitizeMentionTokens(String text) {
        return text
            .replaceAll("@([^\\r\\n{}]+)\\{user:[^}\\s]+}", "@$1")
            .replaceAll("@([^\\r\\n{}]+)\\{team:[^}\\s]+}", "@$1")
            .replaceAll("@([^\\r\\n{}]+)\\{role:[^}\\s]+}", "@$1");
    }
}
