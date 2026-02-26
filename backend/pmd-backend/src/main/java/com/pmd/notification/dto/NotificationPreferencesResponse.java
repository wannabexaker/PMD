package com.pmd.notification.dto;

import com.pmd.notification.model.UserNotificationPreferences;

public class NotificationPreferencesResponse {

    private boolean emailOnAssign;
    private boolean emailOnMentionUser;
    private boolean emailOnMentionTeam;
    private boolean emailOnMentionComment;
    private boolean emailOnMentionDescription;
    private boolean emailOnMentionProjectTitle;
    private boolean emailOnProjectStatusChange;
    private boolean emailOnProjectMembershipChange;
    private boolean emailOnOverdueReminder;
    private boolean emailOnWorkspaceInviteCreated;
    private boolean emailOnWorkspaceJoinRequestSubmitted;
    private boolean emailOnWorkspaceJoinRequestDecision;
    private boolean emailOnWorkspaceInviteAccepted;
    private boolean emailOnWorkspaceInviteAcceptedDigest;

    public NotificationPreferencesResponse() {
    }

    public NotificationPreferencesResponse(UserNotificationPreferences preferences) {
        this.emailOnAssign = preferences.isEmailOnAssign();
        this.emailOnMentionUser = preferences.isEmailOnMentionUser();
        this.emailOnMentionTeam = preferences.isEmailOnMentionTeam();
        this.emailOnMentionComment = preferences.isEmailOnMentionComment();
        this.emailOnMentionDescription = preferences.isEmailOnMentionDescription();
        this.emailOnMentionProjectTitle = preferences.isEmailOnMentionProjectTitle();
        this.emailOnProjectStatusChange = preferences.isEmailOnProjectStatusChange();
        this.emailOnProjectMembershipChange = preferences.isEmailOnProjectMembershipChange();
        this.emailOnOverdueReminder = preferences.isEmailOnOverdueReminder();
        this.emailOnWorkspaceInviteCreated = preferences.isEmailOnWorkspaceInviteCreated();
        this.emailOnWorkspaceJoinRequestSubmitted = preferences.isEmailOnWorkspaceJoinRequestSubmitted();
        this.emailOnWorkspaceJoinRequestDecision = preferences.isEmailOnWorkspaceJoinRequestDecision();
        this.emailOnWorkspaceInviteAccepted = preferences.isEmailOnWorkspaceInviteAccepted();
        this.emailOnWorkspaceInviteAcceptedDigest = preferences.isEmailOnWorkspaceInviteAcceptedDigest();
    }

    public static NotificationPreferencesResponse defaults() {
        NotificationPreferencesResponse response = new NotificationPreferencesResponse();
        response.emailOnAssign = true;
        response.emailOnMentionUser = true;
        response.emailOnMentionTeam = true;
        response.emailOnMentionComment = true;
        response.emailOnMentionDescription = true;
        response.emailOnMentionProjectTitle = true;
        response.emailOnProjectStatusChange = true;
        response.emailOnProjectMembershipChange = true;
        response.emailOnOverdueReminder = true;
        response.emailOnWorkspaceInviteCreated = true;
        response.emailOnWorkspaceJoinRequestSubmitted = true;
        response.emailOnWorkspaceJoinRequestDecision = true;
        response.emailOnWorkspaceInviteAccepted = false;
        response.emailOnWorkspaceInviteAcceptedDigest = true;
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

    public boolean isEmailOnWorkspaceInviteCreated() {
        return emailOnWorkspaceInviteCreated;
    }

    public void setEmailOnWorkspaceInviteCreated(boolean emailOnWorkspaceInviteCreated) {
        this.emailOnWorkspaceInviteCreated = emailOnWorkspaceInviteCreated;
    }

    public boolean isEmailOnWorkspaceJoinRequestSubmitted() {
        return emailOnWorkspaceJoinRequestSubmitted;
    }

    public void setEmailOnWorkspaceJoinRequestSubmitted(boolean emailOnWorkspaceJoinRequestSubmitted) {
        this.emailOnWorkspaceJoinRequestSubmitted = emailOnWorkspaceJoinRequestSubmitted;
    }

    public boolean isEmailOnWorkspaceJoinRequestDecision() {
        return emailOnWorkspaceJoinRequestDecision;
    }

    public void setEmailOnWorkspaceJoinRequestDecision(boolean emailOnWorkspaceJoinRequestDecision) {
        this.emailOnWorkspaceJoinRequestDecision = emailOnWorkspaceJoinRequestDecision;
    }

    public boolean isEmailOnWorkspaceInviteAccepted() {
        return emailOnWorkspaceInviteAccepted;
    }

    public void setEmailOnWorkspaceInviteAccepted(boolean emailOnWorkspaceInviteAccepted) {
        this.emailOnWorkspaceInviteAccepted = emailOnWorkspaceInviteAccepted;
    }

    public boolean isEmailOnWorkspaceInviteAcceptedDigest() {
        return emailOnWorkspaceInviteAcceptedDigest;
    }

    public void setEmailOnWorkspaceInviteAcceptedDigest(boolean emailOnWorkspaceInviteAcceptedDigest) {
        this.emailOnWorkspaceInviteAcceptedDigest = emailOnWorkspaceInviteAcceptedDigest;
    }
}
