package com.pmd.notification.model;

import java.time.Instant;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("user_notification_preferences")
public class UserNotificationPreferences {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

    private boolean emailOnAssign = true;
    private boolean emailOnMentionUser = true;
    private boolean emailOnMentionTeam = true;
    private boolean emailOnMentionComment = true;
    private boolean emailOnMentionDescription = true;
    private boolean emailOnMentionProjectTitle = true;
    private boolean emailOnProjectStatusChange = true;
    private boolean emailOnProjectMembershipChange = true;
    private boolean emailOnOverdueReminder = true;

    private Instant updatedAt;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public boolean isEmailOnAssign() {
        return emailOnAssign;
    }

    public void setEmailOnAssign(boolean emailOnAssign) {
        this.emailOnAssign = emailOnAssign;
    }

    public boolean isEmailOnMentionUser() {
        return emailOnMentionUser;
    }

    public void setEmailOnMentionUser(boolean emailOnMentionUser) {
        this.emailOnMentionUser = emailOnMentionUser;
    }

    public boolean isEmailOnMentionTeam() {
        return emailOnMentionTeam;
    }

    public void setEmailOnMentionTeam(boolean emailOnMentionTeam) {
        this.emailOnMentionTeam = emailOnMentionTeam;
    }

    public boolean isEmailOnMentionComment() {
        return emailOnMentionComment;
    }

    public void setEmailOnMentionComment(boolean emailOnMentionComment) {
        this.emailOnMentionComment = emailOnMentionComment;
    }

    public boolean isEmailOnMentionDescription() {
        return emailOnMentionDescription;
    }

    public void setEmailOnMentionDescription(boolean emailOnMentionDescription) {
        this.emailOnMentionDescription = emailOnMentionDescription;
    }

    public boolean isEmailOnMentionProjectTitle() {
        return emailOnMentionProjectTitle;
    }

    public void setEmailOnMentionProjectTitle(boolean emailOnMentionProjectTitle) {
        this.emailOnMentionProjectTitle = emailOnMentionProjectTitle;
    }

    public boolean isEmailOnProjectStatusChange() {
        return emailOnProjectStatusChange;
    }

    public void setEmailOnProjectStatusChange(boolean emailOnProjectStatusChange) {
        this.emailOnProjectStatusChange = emailOnProjectStatusChange;
    }

    public boolean isEmailOnProjectMembershipChange() {
        return emailOnProjectMembershipChange;
    }

    public void setEmailOnProjectMembershipChange(boolean emailOnProjectMembershipChange) {
        this.emailOnProjectMembershipChange = emailOnProjectMembershipChange;
    }

    public boolean isEmailOnOverdueReminder() {
        return emailOnOverdueReminder;
    }

    public void setEmailOnOverdueReminder(boolean emailOnOverdueReminder) {
        this.emailOnOverdueReminder = emailOnOverdueReminder;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
