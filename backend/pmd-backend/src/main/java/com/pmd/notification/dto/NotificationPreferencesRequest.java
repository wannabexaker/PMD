package com.pmd.notification.dto;

public class NotificationPreferencesRequest {

    private Boolean emailOnAssign;
    private Boolean emailOnMentionUser;
    private Boolean emailOnMentionTeam;
    private Boolean emailOnMentionComment;
    private Boolean emailOnMentionDescription;
    private Boolean emailOnMentionProjectTitle;
    private Boolean emailOnProjectStatusChange;
    private Boolean emailOnProjectMembershipChange;
    private Boolean emailOnOverdueReminder;

    public Boolean getEmailOnAssign() {
        return emailOnAssign;
    }

    public void setEmailOnAssign(Boolean emailOnAssign) {
        this.emailOnAssign = emailOnAssign;
    }

    public Boolean getEmailOnMentionUser() {
        return emailOnMentionUser;
    }

    public void setEmailOnMentionUser(Boolean emailOnMentionUser) {
        this.emailOnMentionUser = emailOnMentionUser;
    }

    public Boolean getEmailOnMentionTeam() {
        return emailOnMentionTeam;
    }

    public void setEmailOnMentionTeam(Boolean emailOnMentionTeam) {
        this.emailOnMentionTeam = emailOnMentionTeam;
    }

    public Boolean getEmailOnMentionComment() {
        return emailOnMentionComment;
    }

    public void setEmailOnMentionComment(Boolean emailOnMentionComment) {
        this.emailOnMentionComment = emailOnMentionComment;
    }

    public Boolean getEmailOnMentionDescription() {
        return emailOnMentionDescription;
    }

    public void setEmailOnMentionDescription(Boolean emailOnMentionDescription) {
        this.emailOnMentionDescription = emailOnMentionDescription;
    }

    public Boolean getEmailOnMentionProjectTitle() {
        return emailOnMentionProjectTitle;
    }

    public void setEmailOnMentionProjectTitle(Boolean emailOnMentionProjectTitle) {
        this.emailOnMentionProjectTitle = emailOnMentionProjectTitle;
    }

    public Boolean getEmailOnProjectStatusChange() {
        return emailOnProjectStatusChange;
    }

    public void setEmailOnProjectStatusChange(Boolean emailOnProjectStatusChange) {
        this.emailOnProjectStatusChange = emailOnProjectStatusChange;
    }

    public Boolean getEmailOnProjectMembershipChange() {
        return emailOnProjectMembershipChange;
    }

    public void setEmailOnProjectMembershipChange(Boolean emailOnProjectMembershipChange) {
        this.emailOnProjectMembershipChange = emailOnProjectMembershipChange;
    }

    public Boolean getEmailOnOverdueReminder() {
        return emailOnOverdueReminder;
    }

    public void setEmailOnOverdueReminder(Boolean emailOnOverdueReminder) {
        this.emailOnOverdueReminder = emailOnOverdueReminder;
    }
}
