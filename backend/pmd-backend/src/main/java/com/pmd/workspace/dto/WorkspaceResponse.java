package com.pmd.workspace.dto;

import com.pmd.workspace.model.WorkspaceMemberRole;
import com.pmd.workspace.model.WorkspaceMemberStatus;
import com.pmd.workspace.model.WorkspaceRolePermissions;
import java.time.Instant;

public class WorkspaceResponse {

    private String id;
    private String name;
    private String slug;
    private WorkspaceMemberRole role;
    private String roleId;
    private String roleName;
    private WorkspaceRolePermissions permissions;
    private WorkspaceMemberStatus status;
    private Instant createdAt;
    private boolean demo;
    private boolean requireApproval;
    private String description;
    private String language;
    private String avatarUrl;
    private Integer maxProjects;
    private Integer maxMembers;
    private Integer maxTeams;
    private Integer maxStorageMb;

    public WorkspaceResponse() {
    }

    public WorkspaceResponse(String id, String name, String slug, WorkspaceMemberRole role,
                             String roleId, String roleName, WorkspaceRolePermissions permissions,
                             WorkspaceMemberStatus status, Instant createdAt, boolean demo,
                             boolean requireApproval, String description, String language, String avatarUrl,
                             Integer maxProjects, Integer maxMembers, Integer maxTeams, Integer maxStorageMb) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.role = role;
        this.roleId = roleId;
        this.roleName = roleName;
        this.permissions = permissions;
        this.status = status;
        this.createdAt = createdAt;
        this.demo = demo;
        this.requireApproval = requireApproval;
        this.description = description;
        this.language = language;
        this.avatarUrl = avatarUrl;
        this.maxProjects = maxProjects;
        this.maxMembers = maxMembers;
        this.maxTeams = maxTeams;
        this.maxStorageMb = maxStorageMb;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSlug() {
        return slug;
    }

    public void setSlug(String slug) {
        this.slug = slug;
    }

    public WorkspaceMemberRole getRole() {
        return role;
    }

    public void setRole(WorkspaceMemberRole role) {
        this.role = role;
    }

    public String getRoleId() {
        return roleId;
    }

    public void setRoleId(String roleId) {
        this.roleId = roleId;
    }

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public WorkspaceRolePermissions getPermissions() {
        return permissions;
    }

    public void setPermissions(WorkspaceRolePermissions permissions) {
        this.permissions = permissions;
    }

    public WorkspaceMemberStatus getStatus() {
        return status;
    }

    public void setStatus(WorkspaceMemberStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isDemo() {
        return demo;
    }

    public void setDemo(boolean demo) {
        this.demo = demo;
    }

    public boolean isRequireApproval() {
        return requireApproval;
    }

    public void setRequireApproval(boolean requireApproval) {
        this.requireApproval = requireApproval;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public Integer getMaxProjects() {
        return maxProjects;
    }

    public void setMaxProjects(Integer maxProjects) {
        this.maxProjects = maxProjects;
    }

    public Integer getMaxMembers() {
        return maxMembers;
    }

    public void setMaxMembers(Integer maxMembers) {
        this.maxMembers = maxMembers;
    }

    public Integer getMaxTeams() {
        return maxTeams;
    }

    public void setMaxTeams(Integer maxTeams) {
        this.maxTeams = maxTeams;
    }

    public Integer getMaxStorageMb() {
        return maxStorageMb;
    }

    public void setMaxStorageMb(Integer maxStorageMb) {
        this.maxStorageMb = maxStorageMb;
    }
}
