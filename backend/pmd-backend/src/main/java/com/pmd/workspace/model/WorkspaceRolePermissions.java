package com.pmd.workspace.model;

public class WorkspaceRolePermissions {

    private boolean inviteMembers;
    private boolean approveJoinRequests;
    private boolean manageRoles;
    private boolean manageTeams;
    private boolean createProject;
    private boolean editProject;
    private boolean deleteProject;
    private boolean assignPeople;
    private boolean viewStats;
    private boolean manageWorkspaceSettings;

    public static WorkspaceRolePermissions ownerDefaults() {
        WorkspaceRolePermissions perms = new WorkspaceRolePermissions();
        perms.inviteMembers = true;
        perms.approveJoinRequests = true;
        perms.manageRoles = true;
        perms.manageTeams = true;
        perms.createProject = true;
        perms.editProject = true;
        perms.deleteProject = true;
        perms.assignPeople = true;
        perms.viewStats = true;
        perms.manageWorkspaceSettings = true;
        return perms;
    }

    public static WorkspaceRolePermissions managerDefaults() {
        WorkspaceRolePermissions perms = new WorkspaceRolePermissions();
        perms.inviteMembers = true;
        perms.approveJoinRequests = true;
        perms.manageRoles = false;
        perms.manageTeams = true;
        perms.createProject = true;
        perms.editProject = true;
        perms.deleteProject = true;
        perms.assignPeople = true;
        perms.viewStats = true;
        perms.manageWorkspaceSettings = true;
        return perms;
    }

    public static WorkspaceRolePermissions memberDefaults() {
        WorkspaceRolePermissions perms = new WorkspaceRolePermissions();
        perms.inviteMembers = true;
        perms.approveJoinRequests = false;
        perms.manageRoles = false;
        perms.manageTeams = false;
        perms.createProject = true;
        perms.editProject = true;
        perms.deleteProject = false;
        perms.assignPeople = true;
        perms.viewStats = true;
        perms.manageWorkspaceSettings = false;
        return perms;
    }

    public static WorkspaceRolePermissions viewerDefaults() {
        WorkspaceRolePermissions perms = new WorkspaceRolePermissions();
        perms.inviteMembers = false;
        perms.approveJoinRequests = false;
        perms.manageRoles = false;
        perms.manageTeams = false;
        perms.createProject = false;
        perms.editProject = false;
        perms.deleteProject = false;
        perms.assignPeople = false;
        perms.viewStats = true;
        perms.manageWorkspaceSettings = false;
        return perms;
    }

    public boolean isInviteMembers() {
        return inviteMembers;
    }

    public void setInviteMembers(boolean inviteMembers) {
        this.inviteMembers = inviteMembers;
    }

    public boolean isApproveJoinRequests() {
        return approveJoinRequests;
    }

    public void setApproveJoinRequests(boolean approveJoinRequests) {
        this.approveJoinRequests = approveJoinRequests;
    }

    public boolean isManageRoles() {
        return manageRoles;
    }

    public void setManageRoles(boolean manageRoles) {
        this.manageRoles = manageRoles;
    }

    public boolean isManageTeams() {
        return manageTeams;
    }

    public void setManageTeams(boolean manageTeams) {
        this.manageTeams = manageTeams;
    }

    public boolean isCreateProject() {
        return createProject;
    }

    public void setCreateProject(boolean createProject) {
        this.createProject = createProject;
    }

    public boolean isEditProject() {
        return editProject;
    }

    public void setEditProject(boolean editProject) {
        this.editProject = editProject;
    }

    public boolean isDeleteProject() {
        return deleteProject;
    }

    public void setDeleteProject(boolean deleteProject) {
        this.deleteProject = deleteProject;
    }

    public boolean isAssignPeople() {
        return assignPeople;
    }

    public void setAssignPeople(boolean assignPeople) {
        this.assignPeople = assignPeople;
    }

    public boolean isViewStats() {
        return viewStats;
    }

    public void setViewStats(boolean viewStats) {
        this.viewStats = viewStats;
    }

    public boolean isManageWorkspaceSettings() {
        return manageWorkspaceSettings;
    }

    public void setManageWorkspaceSettings(boolean manageWorkspaceSettings) {
        this.manageWorkspaceSettings = manageWorkspaceSettings;
    }

    public boolean allows(WorkspacePermission permission) {
        return switch (permission) {
            case INVITE_MEMBERS -> inviteMembers;
            case APPROVE_JOIN_REQUESTS -> approveJoinRequests;
            case MANAGE_ROLES -> manageRoles;
            case MANAGE_TEAMS -> manageTeams;
            case CREATE_PROJECT -> createProject;
            case EDIT_PROJECT -> editProject;
            case DELETE_PROJECT -> deleteProject;
            case ASSIGN_PEOPLE -> assignPeople;
            case VIEW_STATS -> viewStats;
            case MANAGE_WORKSPACE_SETTINGS -> manageWorkspaceSettings;
        };
    }
}
