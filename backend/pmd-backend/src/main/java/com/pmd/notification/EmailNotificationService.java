package com.pmd.notification;

import com.pmd.mail.template.AssignmentEmailModel;
import com.pmd.mail.template.EmailContent;
import com.pmd.mail.template.EmailTemplateBuilder;
import com.pmd.notification.event.ProjectAssignmentCreated;
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

    public EmailNotificationService(JavaMailSender mailSender,
                                    @Value("${pmd.mail.from:no-reply@pmd.local}") String fromAddress,
                                    EmailTemplateBuilder templateBuilder,
                                    UserRepository userRepository) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.templateBuilder = templateBuilder;
        this.userRepository = userRepository;
    }

    @EventListener
    public void onProjectAssignmentCreated(ProjectAssignmentCreated event) {
        if (event == null || event.getAssignedUserEmail() == null || event.getAssignedUserEmail().isBlank()) {
            return;
        }
        User assignedTo = event.getAssignedUserId() != null
            ? userRepository.findById(event.getAssignedUserId()).orElse(null)
            : null;
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

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(event.getAssignedUserEmail());
            helper.setSubject(content.getSubject());
            helper.setText(content.getTextBody(), content.getHtmlBody());
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            logger.warn("Failed to send assignment email to {}", event.getAssignedUserEmail(), ex);
        }
    }
}
