package com.pmd.notification.dto;

import com.pmd.notification.model.UserNotificationPreferences;

public class NotificationPreferencesResponse {

    private boolean emailOnAssign;
    private boolean emailOnMentionUser;
    private boolean emailOnMentionTeam;
    private boolean emailOnProjectStatusChange;
    private boolean emailOnProjectMembershipChange;
    private boolean emailOnOverdueReminder;

    public NotificationPreferencesResponse() {
    }

    public NotificationPreferencesResponse(UserNotificationPreferences preferences) {
        this.emailOnAssign = preferences.isEmailOnAssign();
        this.emailOnMentionUser = preferences.isEmailOnMentionUser();
        this.emailOnMentionTeam = preferences.isEmailOnMentionTeam();
        this.emailOnProjectStatusChange = preferences.isEmailOnProjectStatusChange();
        this.emailOnProjectMembershipChange = preferences.isEmailOnProjectMembershipChange();
        this.emailOnOverdueReminder = preferences.isEmailOnOverdueReminder();
    }

    public static NotificationPreferencesResponse defaults() {
        NotificationPreferencesResponse response = new NotificationPreferencesResponse();
        response.emailOnAssign = true;
        response.emailOnMentionUser = true;
        response.emailOnMentionTeam = true;
        response.emailOnProjectStatusChange = true;
        response.emailOnProjectMembershipChange = true;
        response.emailOnOverdueReminder = true;
        return response;
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
}
