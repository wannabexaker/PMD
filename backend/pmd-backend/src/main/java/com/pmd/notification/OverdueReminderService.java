package com.pmd.notification;

import com.pmd.project.model.Project;
import com.pmd.project.model.ProjectStatus;
import com.pmd.project.repository.ProjectRepository;
import com.pmd.user.model.User;
import com.pmd.user.repository.UserRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class OverdueReminderService {

    private static final Logger logger = LoggerFactory.getLogger(OverdueReminderService.class);
    private static final long OVERDUE_DAYS = 30;

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final EmailNotificationService emailNotificationService;

    public OverdueReminderService(ProjectRepository projectRepository,
                                  UserRepository userRepository,
                                  EmailNotificationService emailNotificationService) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.emailNotificationService = emailNotificationService;
    }

    @Scheduled(cron = "0 0 9 * * *")
    public void sendOverdueReminders() {
        Instant threshold = Instant.now().minus(OVERDUE_DAYS, ChronoUnit.DAYS);
        List<Project> projects = projectRepository.findAll();
        int reminded = 0;
        for (Project project : projects) {
            if (project == null) {
                continue;
            }
            ProjectStatus status = project.getStatus();
            if (status != ProjectStatus.IN_PROGRESS && status != ProjectStatus.NOT_STARTED) {
                continue;
            }
            Instant lastTouched = project.getUpdatedAt() != null ? project.getUpdatedAt() : project.getCreatedAt();
            if (lastTouched == null || lastTouched.isAfter(threshold)) {
                continue;
            }
            List<String> memberIds = project.getMemberIds();
            if (memberIds == null || memberIds.isEmpty()) {
                continue;
            }
            List<User> users = userRepository.findAllById(memberIds).stream()
                .filter(Objects::nonNull)
                .toList();
            for (User user : users) {
                emailNotificationService.sendOverdueReminder(user, project);
                reminded += 1;
            }
        }
        if (reminded > 0) {
            logger.info("Sent {} overdue reminders.", reminded);
        }
    }
}
