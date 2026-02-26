package com.pmd.notification;

import com.pmd.mail.template.AssignmentEmailModel;
import com.pmd.mail.template.EmailContent;
import com.pmd.mail.template.EmailTemplateBuilder;
import com.pmd.notification.event.ProjectAssignmentCreated;
import com.pmd.notification.service.NotificationPreferencesService;
import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import com.pmd.workspace.model.Workspace;
import com.pmd.workspace.model.WorkspaceInvite;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.context.event.EventListener;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Component
public class EmailNotificationService {

    private static final Logger logger = LoggerFactory.getLogger(EmailNotificationService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final EmailTemplateBuilder templateBuilder;
    private final UserRepository userRepository;
    private final NotificationPreferencesService preferencesService;

    public EmailNotificationService(JavaMailSender mailSender,
                                    @Value("${pmd.mail.from:no-reply@pmd.local}") String fromAddress,
                                    EmailTemplateBuilder templateBuilder,
                                    UserRepository userRepository,
                                    NotificationPreferencesService preferencesService) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.templateBuilder = templateBuilder;
        this.userRepository = userRepository;
        this.preferencesService = preferencesService;
    }

    @EventListener
    public void onProjectAssignmentCreated(ProjectAssignmentCreated event) {
        if (event == null || event.getAssignedUserEmail() == null || event.getAssignedUserEmail().isBlank()) {
            return;
        }
        User assignedTo = event.getAssignedUserId() != null
            ? userRepository.findById(event.getAssignedUserId()).orElse(null)
            : null;
        if (assignedTo != null && !preferencesService.resolvePreferences(assignedTo.getId()).isEmailOnAssign()) {
            return;
        }
        User assignedBy = event.getAssignedByUserId() != null
            ? userRepository.findById(event.getAssignedByUserId()).orElse(null)
            : null;

        AssignmentEmailModel model = new AssignmentEmailModel(
            event.getProjectName(),
            event.getProjectStatus(),
            event.getProjectDescription(),
            assignedBy != null ? assignedBy.getDisplayName() : event.getAssignedByUserId(),
            assignedBy != null ? assignedBy.getEmail() : null,
            assignedTo != null ? assignedTo.getDisplayName() : event.getAssignedUserId(),
            event.getAssignedUserEmail(),
            event.getAssignedAt()
        );
        EmailContent content = templateBuilder.buildAssignmentEmail(model);

        sendEmail(event.getAssignedUserEmail(), content, "assignment");
    }

    public void sendProjectStatusChange(User recipient, Project project, ProjectStatus previousStatus, User changedBy) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnProjectStatusChange()) {
            return;
        }
        String fromName = changedBy != null ? changedBy.getDisplayName() : null;
        String subject = "Project status changed: " + safe(project.getName());
        String text = "Project status changed from "
            + safe(previousStatus != null ? previousStatus.name() : "Unknown")
            + " to " + safe(project.getStatus() != null ? project.getStatus().name() : "Unknown")
            + "\nProject: " + safe(project.getName())
            + (fromName != null ? "\nChanged by: " + fromName : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "status change");
    }

    public void sendProjectMembershipChange(User recipient, Project project, String change, User changedBy) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnProjectMembershipChange()) {
            return;
        }
        String actor = changedBy != null ? changedBy.getDisplayName() : null;
        String subject = "Project membership updated: " + safe(project.getName());
        String text = "You were " + change + " the project: " + safe(project.getName())
            + (actor != null ? "\nUpdated by: " + actor : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "membership change");
    }

    public void sendMentionUser(User recipient, Project project, String commentSnippet, User mentionedBy, String source) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        var prefs = preferencesService.resolvePreferences(recipient.getId());
        boolean mentionEnabled = prefs.isEmailOnMentionUser() || prefs.isEmailOnMentionTeam();
        boolean sourceEnabled = isSourceEnabled(source, prefs);
        if (!mentionEnabled) {
            logger.debug(
                "Skipping user mention email to {} (mentionEnabled={}, sourceEnabled={}, source={})",
                recipient.getEmail(),
                mentionEnabled,
                sourceEnabled,
                source
            );
            return;
        }
        String sourceLabel = safe(source).isBlank() ? "comment" : source;
        String subject = "You were mentioned in " + safe(project.getName()) + " (" + sourceLabel + ")";
        String text = "You were mentioned in " + sourceLabel + " on project: " + safe(project.getName())
            + (commentSnippet != null ? "\n\"" + commentSnippet + "\"" : "")
            + (mentionedBy != null ? "\nBy: " + safe(mentionedBy.getDisplayName()) : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "user mention");
    }

    public void sendMentionTeam(User recipient, Project project, String commentSnippet, User mentionedBy, String source) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        var prefs = preferencesService.resolvePreferences(recipient.getId());
        boolean mentionEnabled = prefs.isEmailOnMentionTeam() || prefs.isEmailOnMentionUser();
        boolean sourceEnabled = isSourceEnabled(source, prefs);
        if (!mentionEnabled) {
            logger.debug(
                "Skipping team mention email to {} (mentionEnabled={}, sourceEnabled={}, source={})",
                recipient.getEmail(),
                mentionEnabled,
                sourceEnabled,
                source
            );
            return;
        }
        String sourceLabel = safe(source).isBlank() ? "comment" : source;
        String subject = "Team mention in " + safe(project.getName()) + " (" + sourceLabel + ")";
        String text = "Your team/role was mentioned in " + sourceLabel + " on project: " + safe(project.getName())
            + (commentSnippet != null ? "\n\"" + commentSnippet + "\"" : "")
            + (mentionedBy != null ? "\nBy: " + safe(mentionedBy.getDisplayName()) : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "team mention");
    }

    public void sendOverdueReminder(User recipient, Project project) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnOverdueReminder()) {
            return;
        }
        String subject = "Overdue reminder: " + safe(project.getName());
        String text = "This project appears overdue: " + safe(project.getName());
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "overdue reminder");
    }

    public void sendWorkspaceInviteCreated(User recipient, Workspace workspace, WorkspaceInvite invite, User inviter) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnWorkspaceInviteCreated()) {
            return;
        }
        sendWorkspaceInviteCreatedEmail(recipient.getEmail(), workspace, invite, inviter);
    }

    public void sendWorkspaceInviteCreatedExternal(String email, Workspace workspace, WorkspaceInvite invite, User inviter) {
        if (email == null || email.isBlank()) {
            return;
        }
        sendWorkspaceInviteCreatedEmail(email, workspace, invite, inviter);
    }

    public void sendWorkspaceJoinRequestSubmitted(User recipient, Workspace workspace, User requester) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnWorkspaceJoinRequestSubmitted()) {
            return;
        }
        String subject = "Join request pending approval: " + safe(workspace != null ? workspace.getName() : "Workspace");
        String text = safe(requester != null ? requester.getDisplayName() : "A user")
            + " requested access to workspace " + safe(workspace != null ? workspace.getName() : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "workspace join request submitted");
    }

    public void sendWorkspaceJoinRequestDecision(User recipient, Workspace workspace, boolean approved, User decidedBy) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnWorkspaceJoinRequestDecision()) {
            return;
        }
        String outcome = approved ? "approved" : "denied";
        String subject = "Join request " + outcome + ": " + safe(workspace != null ? workspace.getName() : "Workspace");
        String text = "Your request to join workspace " + safe(workspace != null ? workspace.getName() : "")
            + " was " + outcome + "."
            + (decidedBy != null ? "\nBy: " + safe(decidedBy.getDisplayName()) : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "workspace join request decision");
    }

    public void sendWorkspaceInviteAccepted(User recipient, Workspace workspace, User joinedUser) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnWorkspaceInviteAccepted()) {
            return;
        }
        String subject = "Member joined your workspace: " + safe(workspace != null ? workspace.getName() : "Workspace");
        String text = safe(joinedUser != null ? joinedUser.getDisplayName() : "A member")
            + " joined workspace " + safe(workspace != null ? workspace.getName() : "") + ".";
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "workspace invite accepted");
    }

    public void sendWorkspaceInviteAcceptedDigest(User recipient, String subjectWorkspaceName, java.util.List<String> lines) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (lines == null || lines.isEmpty()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnWorkspaceInviteAcceptedDigest()) {
            return;
        }
        String workspaceName = safe(subjectWorkspaceName);
        StringBuilder body = new StringBuilder();
        body.append("Daily digest: new members joined ");
        body.append(workspaceName.isBlank() ? "your workspaces" : ("workspace " + workspaceName));
        body.append(".\n\n");
        for (String line : lines) {
            body.append("- ").append(safe(line)).append('\n');
        }
        EmailContent content = templateBuilder.buildSimpleEmail("Daily digest: workspace joins", body.toString());
        sendEmail(recipient.getEmail(), content, "workspace invite accepted digest");
    }

    private void sendEmail(String to, EmailContent content, String label) {
        if (to == null || to.isBlank() || content == null) {
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(content.getSubject());
            helper.setText(content.getTextBody(), content.getHtmlBody());
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            logger.warn("Failed to send {} email to {}", label, to, ex);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    private boolean isSourceEnabled(String source, com.pmd.notification.model.UserNotificationPreferences prefs) {
        // Legacy fallback: older preference records may not contain source-specific flags
        // and therefore deserialize as false. In that case, do not block mention emails.
        boolean hasAnySourcePreferenceEnabled =
            prefs.isEmailOnMentionComment() || prefs.isEmailOnMentionDescription() || prefs.isEmailOnMentionProjectTitle();
        if (!hasAnySourcePreferenceEnabled) {
            return true;
        }
        String normalized = source == null ? "" : source.trim().toLowerCase();
        return switch (normalized) {
            case "project description" -> prefs.isEmailOnMentionDescription();
            case "project title" -> prefs.isEmailOnMentionProjectTitle();
            case "comment" -> prefs.isEmailOnMentionComment();
            default -> true;
        };
    }

    private void sendWorkspaceInviteCreatedEmail(String email, Workspace workspace, WorkspaceInvite invite, User inviter) {
        String workspaceName = safe(workspace != null ? workspace.getName() : null);
        String subject = "Workspace invite: " + workspaceName;
        StringBuilder text = new StringBuilder();
        text.append("You were invited to join workspace ").append(workspaceName).append('.');
        if (inviter != null) {
            text.append("\nInvited by: ").append(safe(inviter.getDisplayName()));
        }
        if (invite != null && invite.getCode() != null) {
            text.append("\nInvite code: ").append(invite.getCode());
        }
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text.toString());
        sendEmail(email, content, "workspace invite created");
    }
}
