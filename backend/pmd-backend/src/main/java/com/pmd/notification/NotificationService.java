package com.pmd.notification;

import com.pmd.user.model.User;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    private final JavaMailSender mailSender;
    private final String fromAddress;

    public NotificationService(JavaMailSender mailSender, @Value("${pmd.mail.from:no-reply@pmd.local}") String fromAddress) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
    }

    public void sendAssignmentEmails(String projectId, String projectName, List<User> newlyAssigned) {
        for (User user : newlyAssigned) {
            if (user.getEmail() == null || user.getEmail().isBlank()) {
                continue;
            }
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(user.getEmail());
            message.setSubject("You were assigned to project: " + projectName);
            message.setText("You were assigned to project: " + projectName + "\nProject ID: " + projectId);
            try {
                mailSender.send(message);
            } catch (MailException ex) {
                logger.warn("Failed to send assignment email to {}", user.getEmail(), ex);
            }
        }
    }
}