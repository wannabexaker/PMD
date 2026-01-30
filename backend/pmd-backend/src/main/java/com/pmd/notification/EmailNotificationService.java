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

    public void sendMentionUser(User recipient, Project project, String commentSnippet, User mentionedBy) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnMentionUser()) {
            return;
        }
        String subject = "You were mentioned in " + safe(project.getName());
        String text = "You were mentioned in a comment on project: " + safe(project.getName())
            + (commentSnippet != null ? "\n\"" + commentSnippet + "\"" : "")
            + (mentionedBy != null ? "\nBy: " + safe(mentionedBy.getDisplayName()) : "");
        EmailContent content = templateBuilder.buildSimpleEmail(subject, text);
        sendEmail(recipient.getEmail(), content, "user mention");
    }

    public void sendMentionTeam(User recipient, Project project, String commentSnippet, User mentionedBy) {
        if (recipient == null || recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            return;
        }
        if (!preferencesService.resolvePreferences(recipient.getId()).isEmailOnMentionTeam()) {
            return;
        }
        String subject = "Your team was mentioned in " + safe(project.getName());
        String text = "Your team was mentioned in a comment on project: " + safe(project.getName())
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
}
