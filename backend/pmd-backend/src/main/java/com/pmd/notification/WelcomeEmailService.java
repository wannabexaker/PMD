package com.pmd.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import com.pmd.mail.template.EmailContent;
import com.pmd.mail.template.EmailTemplateBuilder;
import com.pmd.mail.template.WelcomeEmailModel;
import com.pmd.user.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Component
public class WelcomeEmailService {

    private static final Logger logger = LoggerFactory.getLogger(WelcomeEmailService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final EmailTemplateBuilder templateBuilder;

    public WelcomeEmailService(JavaMailSender mailSender,
                               @Value("${pmd.mail.from:no-reply@pmd.local}") String fromAddress,
                               EmailTemplateBuilder templateBuilder) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.templateBuilder = templateBuilder;
    }

    public void sendWelcomeEmail(User user, String token) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        EmailContent content = templateBuilder.buildWelcomeEmail(new WelcomeEmailModel(
            user.getDisplayName(),
            user.getEmail(),
            user.getTeam(),
            user.getCreatedAt(),
            token
        ));
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject(content.getSubject());
            helper.setText(content.getTextBody(), content.getHtmlBody());
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            logger.warn("Failed to send welcome email to {}", user.getEmail(), ex);
        }
    }

    public void sendConfirmedEmail(User user) {
        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }
        EmailContent content = templateBuilder.buildSimpleEmail(
            "Email confirmed successfully",
            "Your PMD account email has been confirmed. You can now use all features."
        );
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject(content.getSubject());
            helper.setText(content.getTextBody(), content.getHtmlBody());
            mailSender.send(message);
        } catch (MailException | MessagingException ex) {
            logger.warn("Failed to send confirmed email to {}", user.getEmail(), ex);
        }
    }
}
