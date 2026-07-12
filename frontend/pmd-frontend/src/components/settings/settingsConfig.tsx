/* eslint-disable react-refresh/only-export-components */
/*
 * Pure configuration, constants, role/notification defaults and presentational
 * icons for the Settings page. Extracted from SettingsPage.tsx to slim the
 * component; no component state lives here. Fast-refresh's component-only-export
 * rule is disabled because this module intentionally colocates the small panel
 * icons with their config (same pattern as ToastProvider).
 */
import type { CSSProperties, ReactNode } from 'react'
import type { WorkspacePermissions, NotificationPreferences } from '../../types'
import type { UiPreferences } from '../../ui/uiPreferences'

export type SettingsPanelId = 'preferences' | 'workspaces' | 'teams' | 'notifications' | 'roles' | 'audit'
export type SettingsViewMode = 'grid' | 'tabs'
export type SettingsGridStyleVars = CSSProperties & {
  '--settings-col-1': string
  '--settings-col-2': string
  '--settings-col-3': string
  '--settings-grid-gap': string
}

export const SETTINGS_PANEL_IDS: SettingsPanelId[] = ['workspaces', 'teams', 'roles', 'audit', 'preferences', 'notifications']

export const SETTINGS_PANEL_ORDER_DEFAULT: SettingsPanelId[] = [
  'workspaces',
  'teams',
  'roles',
  'audit',
  'preferences',
  'notifications',
]

export const SETTINGS_PANEL_LABELS: Record<SettingsPanelId, string> = {
  workspaces: 'Workspaces',
  teams: 'Teams',
  roles: 'Roles',
  audit: 'Audit',
  preferences: 'Preferences',
  notifications: 'Notifications',
}

export const SETTINGS_PANEL_ICONS: Record<SettingsPanelId, ReactNode> = {
  workspaces: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="3" y="4" width="8" height="7" rx="1.2" fill="currentColor" />
      <rect x="13" y="4" width="8" height="7" rx="1.2" fill="currentColor" opacity="0.85" />
      <rect x="3" y="13" width="18" height="7" rx="1.2" fill="currentColor" opacity="0.65" />
    </svg>
  ),
  teams: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <circle cx="8" cy="9" r="3" fill="currentColor" />
      <circle cx="16" cy="9" r="3" fill="currentColor" opacity="0.75" />
      <rect x="5" y="14" width="14" height="6" rx="3" fill="currentColor" opacity="0.6" />
    </svg>
  ),
  roles: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M4 7h16v4H4z" fill="currentColor" />
      <path d="M6 13h12v7H6z" fill="currentColor" opacity="0.65" />
    </svg>
  ),
  audit: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  preferences: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="currentColor" />
      <path
        d="M12 3.5 13.2 6l2.8.5-.9 2.8 2 2-2 2 .9 2.8-2.8.5L12 20.5l-1.2-2.5-2.8-.5.9-2.8-2-2 2-2-.9-2.8 2.8-.5L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path d="M12 4a5 5 0 0 0-5 5v3l-2 3h14l-2-3V9a5 5 0 0 0-5-5Z" fill="currentColor" />
      <rect x="10" y="18" width="4" height="2.5" rx="1.2" fill="currentColor" opacity="0.7" />
    </svg>
  ),
}

export const TEAM_COLOR_PALETTE: string[] = [
  '#EF4444', '#DC2626', '#B91C1C', '#F97316', '#EA580C', '#C2410C', '#F59E0B', '#D97706',
  '#CA8A04', '#EAB308', '#84CC16', '#65A30D', '#4D7C0F', '#22C55E', '#16A34A', '#15803D',
  '#10B981', '#059669', '#047857', '#14B8A6', '#0D9488', '#0F766E', '#06B6D4', '#0891B2',
  '#0E7490', '#0EA5E9', '#0284C7', '#0369A1', '#3B82F6', '#2563EB', '#1D4ED8', '#6366F1',
  '#4F46E5', '#4338CA', '#8B5CF6', '#7C3AED', '#6D28D9', '#A855F7', '#9333EA', '#7E22CE',
  '#D946EF', '#C026D3', '#A21CAF', '#EC4899', '#DB2777', '#BE185D', '#F43F5E', '#E11D48',
  '#BE123C', '#8B5E3C', '#7C4A2A', '#A16207', '#6B7280', '#4B5563', '#374151', '#1F2937',
  '#0EA5A4', '#22D3EE', '#38BDF8', '#60A5FA', '#818CF8', '#A78BFA', '#C084FC', '#5EEAD4',
]

export const PANEL_MIN_HEIGHT: Record<SettingsPanelId, number> = {
  preferences: 200,
  workspaces: 200,
  teams: 200,
  notifications: 200,
  roles: 200,
  audit: 200,
}

export const PANEL_MAX_HEIGHT: Record<SettingsPanelId, number> = {
  preferences: 12000,
  workspaces: 12000,
  teams: 12000,
  notifications: 12000,
  roles: 12000,
  audit: 12000,
}

export const getDefaultPanelHeights = (): Record<SettingsPanelId, number> => {
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
  const baseHeight = Math.max(560, Math.round(viewportHeight * 0.72))
  return {
    preferences: Math.max(PANEL_MIN_HEIGHT.preferences, Math.min(PANEL_MAX_HEIGHT.preferences, baseHeight)),
    workspaces: Math.max(PANEL_MIN_HEIGHT.workspaces, Math.min(PANEL_MAX_HEIGHT.workspaces, baseHeight)),
    teams: Math.max(PANEL_MIN_HEIGHT.teams, Math.min(PANEL_MAX_HEIGHT.teams, baseHeight)),
    notifications: Math.max(PANEL_MIN_HEIGHT.notifications, Math.min(PANEL_MAX_HEIGHT.notifications, baseHeight)),
    roles: Math.max(PANEL_MIN_HEIGHT.roles, Math.min(PANEL_MAX_HEIGHT.roles, baseHeight)),
    audit: Math.max(PANEL_MIN_HEIGHT.audit, Math.min(PANEL_MAX_HEIGHT.audit, baseHeight)),
  }
}
export const MAX_CUSTOM_ROLES_PER_WORKSPACE = 10

export const ROLE_PERMISSION_GROUPS: { label: string; items: { key: keyof WorkspacePermissions; label: string }[] }[] = [
  {
    label: 'Members',
    items: [
      { key: 'inviteMembers', label: 'Invite members' },
      { key: 'approveJoinRequests', label: 'Approve join requests' },
    ],
  },
  {
    label: 'Teams & roles',
    items: [
      { key: 'manageTeams', label: 'Manage teams' },
      { key: 'manageRoles', label: 'Manage roles' },
    ],
  },
  {
    label: 'Projects',
    items: [
      { key: 'createProject', label: 'Create projects' },
      { key: 'editProject', label: 'Edit projects' },
      { key: 'deleteProject', label: 'Delete projects' },
      { key: 'assignPeople', label: 'Assign people' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { key: 'viewStats', label: 'View stats' },
      { key: 'manageWorkspaceSettings', label: 'Manage workspace settings' },
    ],
  },
]

export function SettingsEditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 20h5l10-10-5-5L4 15z" />
      <path d="m12.8 6.2 5 5" />
    </svg>
  )
}

export function SettingsCloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export function SettingsChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {open ? <path d="m6 15 6-6 6 6" /> : <path d="m6 9 6 6 6-6" />}
    </svg>
  )
}

export function SettingsDiceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5h14v14H5z" />
      <circle cx="9" cy="9" r="1.6" />
      <circle cx="15" cy="12" r="1.6" />
      <circle cx="10" cy="15" r="1.6" />
    </svg>
  )
}

export const DEFAULT_ROLE_PERMISSIONS: WorkspacePermissions = {
  inviteMembers: false,
  approveJoinRequests: false,
  manageRoles: false,
  manageTeams: false,
  createProject: false,
  editProject: false,
  deleteProject: false,
  assignPeople: false,
  viewStats: false,
  manageWorkspaceSettings: false,
}

export function getSystemRoleDefaults(roleName?: string | null): WorkspacePermissions {
  const normalized = (roleName ?? '').trim().toLocaleLowerCase()
  if (normalized === 'owner') {
    return {
      inviteMembers: true,
      approveJoinRequests: true,
      manageRoles: true,
      manageTeams: true,
      createProject: true,
      editProject: true,
      deleteProject: true,
      assignPeople: true,
      viewStats: true,
      manageWorkspaceSettings: true,
    }
  }
  if (normalized === 'manager') {
    return {
      inviteMembers: true,
      approveJoinRequests: true,
      manageRoles: false,
      manageTeams: true,
      createProject: true,
      editProject: true,
      deleteProject: true,
      assignPeople: true,
      viewStats: true,
      manageWorkspaceSettings: true,
    }
  }
  if (normalized === 'member') {
    return {
      inviteMembers: true,
      approveJoinRequests: false,
      manageRoles: false,
      manageTeams: false,
      createProject: true,
      editProject: true,
      deleteProject: false,
      assignPeople: true,
      viewStats: true,
      manageWorkspaceSettings: false,
    }
  }
  if (normalized === 'viewer') {
    return {
      inviteMembers: false,
      approveJoinRequests: false,
      manageRoles: false,
      manageTeams: false,
      createProject: false,
      editProject: false,
      deleteProject: false,
      assignPeople: false,
      viewStats: true,
      manageWorkspaceSettings: false,
    }
  }
  return { ...DEFAULT_ROLE_PERMISSIONS }
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  emailOnAssign: true,
  emailOnMentionUser: true,
  emailOnMentionTeam: true,
  emailOnMentionComment: true,
  emailOnMentionDescription: true,
  emailOnMentionProjectTitle: true,
  emailOnProjectStatusChange: true,
  emailOnProjectMembershipChange: true,
  emailOnOverdueReminder: true,
  emailOnWorkspaceInviteCreated: true,
  emailOnWorkspaceJoinRequestSubmitted: true,
  emailOnWorkspaceJoinRequestDecision: true,
  emailOnWorkspaceInviteAccepted: false,
  emailOnWorkspaceInviteAcceptedDigest: true,
}

export const AUDIT_CATEGORIES = ['WORKSPACE', 'MEMBERSHIP', 'INVITE', 'REQUEST', 'TEAM', 'ROLE', 'PROJECT', 'GENERAL']

export const DEFAULT_SETTINGS_GRID_BOUNDS = {
  col1: 430,
  col2: 320,
  col3: 320,
  gap: 16,
  showGuides: true,
}

export type SettingsPageProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

export type SavedCropState = { x: number; y: number; zoom: number }
export type ComingSoonSectionId = 'preferences' | 'notifications' | 'workspacesGrid' | 'workspacesTabs'
export const WORKSPACE_CROP_STORAGE_KEY = 'pmd.workspacePictureCropByUrl'

export function loadSavedCropMap(storageKey: string): Record<string, SavedCropState> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SavedCropState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}
