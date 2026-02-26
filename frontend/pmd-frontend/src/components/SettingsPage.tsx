import type { UiPreferences } from '../ui/uiPreferences'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { useAuth } from '../auth/authUtils'
import { getNotificationPreferences, updateNotificationPreferences } from '../api/notifications'
import {
  approveJoinRequest,
  cancelOwnJoinRequest,
  createInvite,
  createRole,
  denyJoinRequest,
  listInvites,
  listJoinRequests,
  listRoles,
  resolveInvite,
  revokeInvite,
  assignMemberRole,
  updateRole,
  updateWorkspaceSettings,
  listWorkspaceAudit,
} from '../api/workspaces'
import { fetchUsers } from '../api/users'
import { API_BASE_URL, isApiError } from '../api/http'
import { getErrorMessage, isForbiddenError } from '../api/errors'
import { uploadImage } from '../api/uploads'
import { getAvatarFrameStyle } from '../shared/avatarFrame'
import type {
  WorkspaceInvite,
  WorkspaceJoinRequest,
  WorkspaceRole,
  WorkspacePermissions,
  UserSummary,
  NotificationPreferences,
  WorkspaceAuditEvent,
} from '../types'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

type SettingsPanelId = 'preferences' | 'workspaces' | 'teams' | 'notifications' | 'roles' | 'audit'
type SettingsViewMode = 'grid' | 'tabs'
type SettingsGridStyleVars = CSSProperties & {
  '--settings-col-1': string
  '--settings-col-2': string
  '--settings-col-3': string
  '--settings-grid-gap': string
}

const SETTINGS_PANEL_IDS: SettingsPanelId[] = ['workspaces', 'teams', 'roles', 'audit', 'preferences', 'notifications']

const SETTINGS_PANEL_ORDER_DEFAULT: SettingsPanelId[] = [
  'workspaces',
  'teams',
  'roles',
  'audit',
  'preferences',
  'notifications',
]

const SETTINGS_PANEL_LABELS: Record<SettingsPanelId, string> = {
  workspaces: 'Workspaces',
  teams: 'Teams',
  roles: 'Roles',
  audit: 'Audit',
  preferences: 'Preferences',
  notifications: 'Notifications',
}

const SETTINGS_PANEL_ICONS: Record<SettingsPanelId, ReactNode> = {
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

const TEAM_COLOR_PALETTE: string[] = [
  '#EF4444', '#DC2626', '#B91C1C', '#F97316', '#EA580C', '#C2410C', '#F59E0B', '#D97706',
  '#CA8A04', '#EAB308', '#84CC16', '#65A30D', '#4D7C0F', '#22C55E', '#16A34A', '#15803D',
  '#10B981', '#059669', '#047857', '#14B8A6', '#0D9488', '#0F766E', '#06B6D4', '#0891B2',
  '#0E7490', '#0EA5E9', '#0284C7', '#0369A1', '#3B82F6', '#2563EB', '#1D4ED8', '#6366F1',
  '#4F46E5', '#4338CA', '#8B5CF6', '#7C3AED', '#6D28D9', '#A855F7', '#9333EA', '#7E22CE',
  '#D946EF', '#C026D3', '#A21CAF', '#EC4899', '#DB2777', '#BE185D', '#F43F5E', '#E11D48',
  '#BE123C', '#8B5E3C', '#7C4A2A', '#A16207', '#6B7280', '#4B5563', '#374151', '#1F2937',
  '#0EA5A4', '#22D3EE', '#38BDF8', '#60A5FA', '#818CF8', '#A78BFA', '#C084FC', '#5EEAD4',
]

const PANEL_MIN_HEIGHT: Record<SettingsPanelId, number> = {
  preferences: 200,
  workspaces: 200,
  teams: 200,
  notifications: 200,
  roles: 200,
  audit: 200,
}

const PANEL_MAX_HEIGHT: Record<SettingsPanelId, number> = {
  preferences: 12000,
  workspaces: 12000,
  teams: 12000,
  notifications: 12000,
  roles: 12000,
  audit: 12000,
}

const getDefaultPanelHeights = (): Record<SettingsPanelId, number> => {
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
const MAX_CUSTOM_ROLES_PER_WORKSPACE = 10

const ROLE_PERMISSION_GROUPS: { label: string; items: { key: keyof WorkspacePermissions; label: string }[] }[] = [
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

const DEFAULT_ROLE_PERMISSIONS: WorkspacePermissions = {
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

function getSystemRoleDefaults(roleName?: string | null): WorkspacePermissions {
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

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
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

const AUDIT_CATEGORIES = ['WORKSPACE', 'MEMBERSHIP', 'INVITE', 'REQUEST', 'TEAM', 'ROLE', 'PROJECT', 'GENERAL']

const DEFAULT_SETTINGS_GRID_BOUNDS = {
  col1: 430,
  col2: 320,
  col3: 320,
  gap: 16,
  showGuides: true,
}

type SettingsPageProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

type SavedCropState = { x: number; y: number; zoom: number }
type ComingSoonSectionId = 'preferences' | 'notifications' | 'workspacesGrid' | 'workspacesTabs'
const WORKSPACE_CROP_STORAGE_KEY = 'pmd.workspacePictureCropByUrl'

function loadSavedCropMap(storageKey: string): Record<string, SavedCropState> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SavedCropState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function SettingsPage({ preferences, onChange }: SettingsPageProps) {
  const {
    activeWorkspace,
    activeWorkspaceId,
    workspaces,
    setActiveWorkspaceId,
    createWorkspace,
    joinWorkspace,
    resetDemo,
    refresh,
  } = useWorkspace()
  const { user } = useAuth()
  const { teams, createTeam, updateTeam, refresh: refreshTeams } = useTeams()
  const { showToast } = useToast()
  const [workspaceName, setWorkspaceName] = useState('')
  const [joinValue, setJoinValue] = useState('')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [inviteDays, setInviteDays] = useState('7')
  const [inviteMaxUses, setInviteMaxUses] = useState('10')
  const [inviteDefaultRoleId, setInviteDefaultRoleId] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteQuestion, setInviteQuestion] = useState('')
  const [joinInviteQuestion, setJoinInviteQuestion] = useState('')
  const [joinInviteWorkspaceName, setJoinInviteWorkspaceName] = useState('')
  const [joinInviteAnswer, setJoinInviteAnswer] = useState('')
  const [joinInviteResolving, setJoinInviteResolving] = useState(false)
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [requests, setRequests] = useState<WorkspaceJoinRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [openInviteMenuId, setOpenInviteMenuId] = useState<string | null>(null)
  const [auditEvents, setAuditEvents] = useState<WorkspaceAuditEvent[]>([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditQuery, setAuditQuery] = useState('')
  const [auditCategory, setAuditCategory] = useState('')
  const [auditAction, setAuditAction] = useState('')
  const [auditActorUserId, setAuditActorUserId] = useState('')
  const [auditTargetUserId, setAuditTargetUserId] = useState('')
  const [auditTeamId, setAuditTeamId] = useState('')
  const [auditRoleId, setAuditRoleId] = useState('')
  const [auditProjectId, setAuditProjectId] = useState('')
  const [auditPersonalOnly, setAuditPersonalOnly] = useState(false)
  const [auditFiltersOpen, setAuditFiltersOpen] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [workspaceProfileTargetId, setWorkspaceProfileTargetId] = useState<string | null>(null)
  const [workspaceProfileName, setWorkspaceProfileName] = useState('')
  const [workspaceProfileSlug, setWorkspaceProfileSlug] = useState('')
  const [workspaceProfileLanguage, setWorkspaceProfileLanguage] = useState('')
  const [workspaceProfileAvatarUrl, setWorkspaceProfileAvatarUrl] = useState('')
  const [workspaceProfileMaxProjects, setWorkspaceProfileMaxProjects] = useState('')
  const [workspaceProfileMaxMembers, setWorkspaceProfileMaxMembers] = useState('')
  const [workspaceProfileMaxTeams, setWorkspaceProfileMaxTeams] = useState('')
  const [workspaceProfileMaxStorageMb, setWorkspaceProfileMaxStorageMb] = useState('')
  const [workspaceProfileAvatarUploading, setWorkspaceProfileAvatarUploading] = useState(false)
  const [workspaceAvatarCropFile, setWorkspaceAvatarCropFile] = useState<File | null>(null)
  const [workspaceAvatarCropPreviewUrl, setWorkspaceAvatarCropPreviewUrl] = useState('')
  const [workspaceAvatarCropX, setWorkspaceAvatarCropX] = useState(50)
  const [workspaceAvatarCropY, setWorkspaceAvatarCropY] = useState(50)
  const [workspaceAvatarCropZoom, setWorkspaceAvatarCropZoom] = useState(100)
  const [workspaceAvatarCropSourceUrl, setWorkspaceAvatarCropSourceUrl] = useState<string | null>(null)
  const [savedWorkspaceCropByUrl, setSavedWorkspaceCropByUrl] = useState<Record<string, SavedCropState>>(() =>
    loadSavedCropMap(WORKSPACE_CROP_STORAGE_KEY)
  )
  const [pmdImages, setPmdImages] = useState<string[]>([])
  const [workspacePmdImagesOpen, setWorkspacePmdImagesOpen] = useState(false)
  const [workspaceProfileDescription, setWorkspaceProfileDescription] = useState('')
  const [teamName, setTeamName] = useState('')
  const [teamColor, setTeamColor] = useState<string>('#3B82F6')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')
  const [editingTeamColor, setEditingTeamColor] = useState<string>('#3B82F6')
  const [editingTeamAction, setEditingTeamAction] = useState<'rename' | 'delete' | 'toggle' | null>(null)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [roles, setRoles] = useState<WorkspaceRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [rolePermissions, setRolePermissions] = useState<WorkspacePermissions>({ ...DEFAULT_ROLE_PERMISSIONS })
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleAction, setEditingRoleAction] = useState<'rename' | 'permissions' | 'reset' | null>(null)
  const [editingRolePermissions, setEditingRolePermissions] = useState<WorkspacePermissions>({
    ...DEFAULT_ROLE_PERMISSIONS,
  })
  const [members, setMembers] = useState<UserSummary[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRoleId, setAssignRoleId] = useState('')
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [panelOrder, setPanelOrder] = useState<SettingsPanelId[]>(SETTINGS_PANEL_ORDER_DEFAULT)
  const [settingsViewMode, setSettingsViewMode] = useState<SettingsViewMode>(
    preferences.settingsDefaultView === 'tabs' ? 'tabs' : 'grid'
  )
  const [settingsGridBounds, setSettingsGridBounds] = useState(DEFAULT_SETTINGS_GRID_BOUNDS)
  const [activeTabPanel, setActiveTabPanel] = useState<SettingsPanelId>('workspaces')
  const [comingSoonExpanded, setComingSoonExpanded] = useState<Record<ComingSoonSectionId, boolean>>({
    preferences: false,
    notifications: false,
    workspacesGrid: false,
    workspacesTabs: false,
  })
  const [draggingPanel, setDraggingPanel] = useState<SettingsPanelId | null>(null)
  const [dragOverPanel, setDragOverPanel] = useState<SettingsPanelId | 'end' | null>(null)
  const [orderMenuPanel, setOrderMenuPanel] = useState<SettingsPanelId | null>(null)
  const [orderTargetPosition, setOrderTargetPosition] = useState(1)
  const [panelHeights, setPanelHeights] = useState<Record<SettingsPanelId, number>>(() => getDefaultPanelHeights())
  const [panelRowSpans, setPanelRowSpans] = useState<Record<SettingsPanelId, number>>({
    preferences: 1,
    workspaces: 1,
    teams: 1,
    notifications: 1,
    roles: 1,
    audit: 1,
  })
  const [activeResize, setActiveResize] = useState<{
    id: SettingsPanelId
    edge: 'top' | 'bottom'
    startY: number
    startHeight: number
  } | null>(null)
  const panelRefs = useRef<Record<SettingsPanelId, HTMLDivElement | null>>({
    preferences: null,
    workspaces: null,
    teams: null,
    notifications: null,
    roles: null,
    audit: null,
  })
  const pendingFitPanelsRef = useRef<Set<SettingsPanelId>>(new Set())
  const fitRafRef = useRef<number | null>(null)
  const suspendGridAutoFitRef = useRef(false)
  const gridBoundsRafRef = useRef<number | null>(null)
  const pendingGridBoundsRef = useRef(DEFAULT_SETTINGS_GRID_BOUNDS)
  const settingsPanelRootRef = useRef<HTMLElement | null>(null)
  const workspaceCropDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const workspaceProfileAvatarFileRef = useRef<HTMLInputElement | null>(null)
  const lastResolvedJoinTokenRef = useRef('')

  const resolveAssetUrl = useCallback((url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const prefix = url.startsWith('/') ? '' : '/'
    return `${API_BASE_URL}${prefix}${url}`
  }, [])

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [workspaces]
  )
  const listedWorkspaces = useMemo(() => sortedWorkspaces, [sortedWorkspaces])
  const isAdmin = Boolean(user?.isAdmin)
  const permissions = activeWorkspace?.permissions ?? {}
  const canInviteMembers = Boolean(permissions.inviteMembers) || isAdmin
  const canApproveRequests = Boolean(permissions.approveJoinRequests) || isAdmin
  const canManageTeams = Boolean(permissions.manageTeams) || isAdmin || Boolean(activeWorkspace?.demo)
  const canManageRoles = Boolean(permissions.manageRoles) || isAdmin || Boolean(activeWorkspace?.demo)
  const canViewAudit = Boolean(permissions.viewStats) || isAdmin
  const canEditTeams = canManageTeams && Boolean(activeWorkspaceId)
  const canEditRoles = canManageRoles && Boolean(activeWorkspaceId)
  const workspaceRole = `${activeWorkspace?.roleName ?? activeWorkspace?.role ?? ''}`.toLocaleLowerCase()
  const canCreateTeamsByRole =
    isAdmin || workspaceRole.includes('owner') || workspaceRole.includes('manager') || workspaceRole.includes('admin')
  const canCreateTeams = canEditTeams && canCreateTeamsByRole
  const gridResizeEnabled = settingsViewMode === 'grid' && preferences.settingsGridResizeEnabled
  const defaultInviteRoleId = useMemo(() => {
    const memberRole = roles.find((role) => `${role.name ?? ''}`.trim().toLocaleLowerCase() === 'member')
    return (memberRole?.id as string | undefined) ?? ''
  }, [roles])
  const roleNameById = useMemo(() => {
    const pairs = roles
      .filter((role) => role.id)
      .map((role) => [role.id as string, role.name ?? 'Role'] as const)
    return new Map<string, string>(pairs)
  }, [roles])
  const editingTeam = useMemo(
    () => teams.find((team) => team.id === editingTeamId) ?? null,
    [teams, editingTeamId]
  )
  const editingRole = useMemo(
    () => roles.find((role) => role.id === editingRoleId) ?? null,
    [roles, editingRoleId]
  )
  const sortedNotificationRows = useMemo(() => {
    if (!notificationPreferences) return []
    const rows: Array<{ key: keyof NotificationPreferences; label: string; checked: boolean }> = [
      { key: 'emailOnAssign', label: 'Email when assigned', checked: notificationPreferences.emailOnAssign },
      { key: 'emailOnMentionUser', label: 'Email on @mention', checked: notificationPreferences.emailOnMentionUser },
      { key: 'emailOnMentionTeam', label: 'Email on @teammention', checked: notificationPreferences.emailOnMentionTeam },
      { key: 'emailOnMentionComment', label: 'Email mention from comments', checked: notificationPreferences.emailOnMentionComment },
      {
        key: 'emailOnMentionDescription',
        label: 'Email mention from project descriptions',
        checked: notificationPreferences.emailOnMentionDescription,
      },
      {
        key: 'emailOnMentionProjectTitle',
        label: 'Email mention from project titles',
        checked: notificationPreferences.emailOnMentionProjectTitle,
      },
      {
        key: 'emailOnProjectMembershipChange',
        label: 'Email when added/removed from a project',
        checked: notificationPreferences.emailOnProjectMembershipChange,
      },
      {
        key: 'emailOnProjectStatusChange',
        label: 'Email when project status changes',
        checked: notificationPreferences.emailOnProjectStatusChange,
      },
      { key: 'emailOnOverdueReminder', label: 'Email overdue reminders', checked: notificationPreferences.emailOnOverdueReminder },
      {
        key: 'emailOnWorkspaceInviteCreated',
        label: 'Email when direct invite is created',
        checked: notificationPreferences.emailOnWorkspaceInviteCreated,
      },
      {
        key: 'emailOnWorkspaceJoinRequestSubmitted',
        label: 'Email when join request is submitted',
        checked: notificationPreferences.emailOnWorkspaceJoinRequestSubmitted,
      },
      {
        key: 'emailOnWorkspaceJoinRequestDecision',
        label: 'Email when join request is approved/denied',
        checked: notificationPreferences.emailOnWorkspaceJoinRequestDecision,
      },
      {
        key: 'emailOnWorkspaceInviteAccepted',
        label: 'Email when invited member joins workspace (instant)',
        checked: notificationPreferences.emailOnWorkspaceInviteAccepted,
      },
      {
        key: 'emailOnWorkspaceInviteAcceptedDigest',
        label: 'Email digest for invited members who joined',
        checked: notificationPreferences.emailOnWorkspaceInviteAcceptedDigest,
      },
    ]
    return rows.sort((a, b) => a.label.localeCompare(b.label))
  }, [notificationPreferences])

  const toggleComingSoon = useCallback((section: ComingSoonSectionId) => {
    setComingSoonExpanded((prev) => ({ ...prev, [section]: !prev[section] }))
  }, [])

  const isWorkspaceCreator = useCallback(
    (workspace: (typeof workspaces)[number] | null | undefined) => {
      if (!workspace) return false
      if (isAdmin) return true
      const role = `${workspace.roleName ?? workspace.role ?? ''}`.toLocaleLowerCase()
      return role.includes('owner')
    },
    [isAdmin]
  )

  const canEditWorkspaceProfileFor = useCallback(
    (workspace: (typeof workspaces)[number] | null | undefined) => {
      if (!workspace) return false
      if (isAdmin) return true
      return Boolean(workspace.permissions?.manageWorkspaceSettings) || isWorkspaceCreator(workspace)
    },
    [isAdmin, isWorkspaceCreator]
  )

  const profileWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === workspaceProfileTargetId) ?? null,
    [workspaces, workspaceProfileTargetId]
  )
  const canEditSelectedProfile = canEditWorkspaceProfileFor(profileWorkspace)

  const teamMemberCountById = useMemo(() => {
    const counts = new Map<string, number>()
    members.forEach((member) => {
      const teamId = member.teamId ?? ''
      if (!teamId) return
      counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
    })
    return counts
  }, [members])

  const roleMemberCountByName = useMemo(() => {
    const counts = new Map<string, number>()
    members.forEach((member) => {
      const roleName = (member.roleName ?? '').trim().toLocaleLowerCase()
      if (!roleName) return
      counts.set(roleName, (counts.get(roleName) ?? 0) + 1)
    })
    return counts
  }, [members])

  const customRolesCount = useMemo(
    () => roles.filter((role) => !role.system).length,
    [roles]
  )
  const customRolesLimitReached = customRolesCount >= MAX_CUSTOM_ROLES_PER_WORKSPACE

  const movePanel = useCallback((sourceId: SettingsPanelId, targetId: SettingsPanelId | 'end') => {
    if (sourceId === targetId) return
    setPanelOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId)
      if (sourceIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      const targetIndex = targetId === 'end' ? next.length : next.indexOf(targetId)
      if (targetIndex === -1) return prev
      next.splice(targetIndex, 0, moved)
      return next
    })
  }, [])

  const movePanelToPosition = useCallback((sourceId: SettingsPanelId, targetPosition: number) => {
    setPanelOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId)
      if (sourceIndex === -1) return prev
      const targetIndex = Math.max(0, Math.min(prev.length - 1, targetPosition - 1))
      if (sourceIndex === targetIndex) return prev
      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }, [])

  const setPanelRef = useCallback(
    (id: SettingsPanelId) => (node: HTMLDivElement | null) => {
      panelRefs.current[id] = node
    },
    []
  )

  const panelCardStyle = useCallback(
    (id: SettingsPanelId) =>
      settingsViewMode === 'tabs'
        ? {
            order: 1,
            height: 'auto',
            gridRowEnd: 'span 1',
          }
        : {
            order: panelOrder.indexOf(id) + 1,
            height: `${panelHeights[id]}px`,
            gridRowEnd: `span ${panelRowSpans[id]}`,
          },
    [panelHeights, panelOrder, panelRowSpans, settingsViewMode]
  )

  const settingsGridStyle = useMemo<SettingsGridStyleVars | undefined>(() => {
    if (settingsViewMode !== 'grid') return undefined
    return {
      '--settings-col-1': `${settingsGridBounds.col1}px`,
      '--settings-col-2': `${settingsGridBounds.col2}px`,
      '--settings-col-3': `${settingsGridBounds.col3}px`,
      '--settings-grid-gap': `${settingsGridBounds.gap}px`,
    }
  }, [settingsViewMode, settingsGridBounds])

  const clampPanelHeight = useCallback((id: SettingsPanelId, rawHeight: number) => {
    const minHeight = PANEL_MIN_HEIGHT[id]
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080
    const dynamicMax = Math.max(4000, Math.round(viewportHeight * 6))
    const maxHeight = Math.min(PANEL_MAX_HEIGHT[id], dynamicMax)
    return Math.max(minHeight, Math.min(maxHeight, Math.round(rawHeight)))
  }, [])

  const scheduleFitPanel = useCallback(
    (id: SettingsPanelId) => {
      if (settingsViewMode !== 'grid') return
      if (activeResize || draggingPanel) return
      if (suspendGridAutoFitRef.current) return
      pendingFitPanelsRef.current.add(id)
      if (fitRafRef.current != null) return
      fitRafRef.current = window.requestAnimationFrame(() => {
        fitRafRef.current = null
        const pending = Array.from(pendingFitPanelsRef.current)
        pendingFitPanelsRef.current.clear()
        if (!pending.length) return
        setPanelHeights((prev) => {
          let next = prev
          pending.forEach((panelId) => {
            const card = panelRefs.current[panelId]
            if (!card) return
            const header = card.querySelector('.panel-header') as HTMLElement | null
            const body = card.querySelector('.settings-card-body') as HTMLElement | null
            if (!header || !body) return
            const desired = header.offsetHeight + body.scrollHeight + 28
            const nextHeight = clampPanelHeight(panelId, desired)
            if (next[panelId] !== nextHeight) {
              if (next === prev) {
                next = { ...prev }
              }
              next[panelId] = nextHeight
            }
          })
          return next
        })
      })
    },
    [activeResize, clampPanelHeight, draggingPanel, settingsViewMode]
  )

  const releaseGridBoundsDrag = useCallback(() => {
    suspendGridAutoFitRef.current = false
    SETTINGS_PANEL_IDS.forEach((id) => scheduleFitPanel(id))
  }, [scheduleFitPanel])

  const updateGridBounds = useCallback((key: 'col1' | 'col2' | 'col3' | 'gap', value: number) => {
    const min = { col1: 320, col2: 260, col3: 260, gap: 8 }
    const max = { col1: 780, col2: 620, col3: 620, gap: 28 }
    const rootWidth =
      settingsPanelRootRef.current?.querySelector('.settings-grid')?.getBoundingClientRect().width ??
      settingsPanelRootRef.current?.getBoundingClientRect().width ??
      window.innerWidth
    const next = { ...pendingGridBoundsRef.current, [key]: Math.round(Math.max(min[key], Math.min(max[key], value))) }
    const totalMin = min.col1 + min.col2 + min.col3 + min.gap * 2
    const maxTotal = Math.max(totalMin, Math.floor(rootWidth) - 24)
    const total = next.col1 + next.col2 + next.col3 + next.gap * 2
    let overflow = total - maxTotal
    if (overflow > 0) {
      const keys: Array<'col1' | 'col2' | 'col3'> = ['col1', 'col2', 'col3'].filter((k) => k !== key) as Array<
        'col1' | 'col2' | 'col3'
      >
      keys.forEach((k) => {
        if (overflow <= 0) return
        const reducible = next[k] - min[k]
        if (reducible <= 0) return
        const cut = Math.min(reducible, overflow)
        next[k] -= cut
        overflow -= cut
      })
      if (overflow > 0 && key !== 'gap') {
        const reducible = next[key] - min[key]
        const cut = Math.min(reducible, overflow)
        next[key] -= cut
        overflow -= cut
      }
    }
    pendingGridBoundsRef.current = next
    if (gridBoundsRafRef.current != null) return
    gridBoundsRafRef.current = window.requestAnimationFrame(() => {
      gridBoundsRafRef.current = null
      setSettingsGridBounds({ ...pendingGridBoundsRef.current })
    })
  }, [])

  const handleResizeStart = useCallback(
    (id: SettingsPanelId, edge: 'top' | 'bottom') =>
      (event: ReactMouseEvent<HTMLDivElement>) => {
        if (!preferences.settingsGridResizeEnabled) {
          return
        }
        event.preventDefault()
        const card = event.currentTarget.closest('.settings-card') as HTMLElement | null
        const fallbackHeight = card?.getBoundingClientRect().height ?? 700
        setActiveResize({
          id,
          edge,
          startY: event.clientY,
          startHeight: panelHeights[id] ?? fallbackHeight,
        })
      },
    [panelHeights, preferences.settingsGridResizeEnabled]
  )

  const parseInviteToken = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.includes('invite=') || trimmed.includes('token=') || trimmed.includes('code=')) {
      const match = trimmed.match(/[?&](invite|token|code)=([^&]+)/)
      if (match?.[1]) {
        return decodeURIComponent(match[2])
      }
    }
    try {
      const url = new URL(trimmed)
      const token =
        url.searchParams.get('invite') ?? url.searchParams.get('token') ?? url.searchParams.get('code')
      if (token) return token
    } catch {
      // not a URL
    }
    return trimmed
  }

  const buildInviteLink = (token?: string | null) => {
    if (!token) return ''
    return `${window.location.origin}/join?invite=${encodeURIComponent(token)}`
  }

  useEffect(() => {
    const token = parseInviteToken(joinValue)
    if (!token || token.length < 4) {
      lastResolvedJoinTokenRef.current = ''
      setJoinInviteQuestion('')
      setJoinInviteWorkspaceName('')
      setJoinInviteAnswer('')
      setJoinInviteResolving(false)
      return
    }
    if (token === lastResolvedJoinTokenRef.current) {
      return
    }

    let active = true
    const timeoutId = window.setTimeout(async () => {
      setJoinInviteResolving(true)
      try {
        const resolved = await resolveInvite(token)
        if (!active) return
        lastResolvedJoinTokenRef.current = token
        const nextQuestion = (resolved.joinQuestion ?? '').trim()
        setJoinInviteQuestion(nextQuestion)
        setJoinInviteWorkspaceName((resolved.workspaceName ?? '').trim())
        if (!nextQuestion) {
          setJoinInviteAnswer('')
        }
      } catch {
        if (!active) return
        lastResolvedJoinTokenRef.current = ''
        setJoinInviteQuestion('')
        setJoinInviteWorkspaceName('')
        setJoinInviteAnswer('')
      } finally {
        if (active) {
          setJoinInviteResolving(false)
        }
      }
    }, 220)

    return () => {
      active = false
      window.clearTimeout(timeoutId)
    }
  }, [joinValue])

  const loadInvites = useCallback(async (workspaceId: string) => {
    setInvitesLoading(true)
    try {
      const data = await listInvites(workspaceId)
      setInvites(data)
    } catch {
      showToast({ type: 'error', message: 'Failed to load invites.' })
    } finally {
      setInvitesLoading(false)
    }
  }, [showToast])

  const loadRequests = useCallback(async (workspaceId: string) => {
    setRequestsLoading(true)
    try {
      const data = await listJoinRequests(workspaceId)
      setRequests(data)
    } catch {
      showToast({ type: 'error', message: 'Failed to load join requests.' })
    } finally {
      setRequestsLoading(false)
    }
  }, [showToast])

  const loadRoles = useCallback(async (workspaceId: string) => {
    setRolesLoading(true)
    setRolesError(null)
    try {
      const data = await listRoles(workspaceId)
      const sorted = [...data].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      setRoles(sorted)
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to load roles.')
      if (isForbiddenError(err)) {
        setRolesError('You do not have permission to view roles in this workspace.')
      } else {
        setRolesError(message)
        showToast({ type: 'error', message })
      }
    } finally {
      setRolesLoading(false)
    }
  }, [showToast])

  const loadMembers = useCallback(async (workspaceId: string) => {
    setMembersLoading(true)
    try {
      const data = await fetchUsers(workspaceId)
      const sorted = [...data].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
      setMembers(sorted)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load members.'
      showToast({ type: 'error', message })
    } finally {
      setMembersLoading(false)
    }
  }, [showToast])

  const loadAudit = useCallback(async (workspaceId: string) => {
    if (!canViewAudit) {
      setAuditEvents([])
      return
    }
    setAuditLoading(true)
    try {
      const data = await listWorkspaceAudit(workspaceId, {
        personalOnly: auditPersonalOnly,
        actorUserId: auditActorUserId || undefined,
        targetUserId: auditTargetUserId || undefined,
        teamId: auditTeamId || undefined,
        roleId: auditRoleId || undefined,
        projectId: auditProjectId || undefined,
        category: auditCategory || undefined,
        action: auditAction || undefined,
        q: auditQuery || undefined,
        limit: 150,
      })
      setAuditEvents(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audit log.'
      showToast({ type: 'error', message })
      setAuditEvents([])
    } finally {
      setAuditLoading(false)
    }
  }, [
    canViewAudit,
    auditPersonalOnly,
    auditActorUserId,
    auditTargetUserId,
    auditTeamId,
    auditRoleId,
    auditProjectId,
    auditCategory,
    auditAction,
    auditQuery,
    showToast,
  ])

  const handleResetDemo = async () => {
    const confirmed = window.confirm('Reset the Demo Workspace back to the seeded data?')
    if (!confirmed) return
    const ok = await resetDemo()
    if (ok) {
      await refreshTeams()
      window.dispatchEvent(new CustomEvent('pmd:workspace-reset'))
    }
    showToast({
      type: ok ? 'success' : 'error',
      message: ok ? 'Demo Workspace reset.' : 'Failed to reset Demo Workspace.',
    })
  }

  const handleCreateWorkspace = async () => {
    const name = workspaceName.trim()
    if (!name) {
      showToast({ type: 'error', message: 'Workspace name is required.' })
      return
    }
    setWorkspaceBusy(true)
    const created = await createWorkspace(name)
    setWorkspaceBusy(false)
    if (created?.id) {
      setWorkspaceName('')
      await refresh()
      showToast({ type: 'success', message: 'Workspace created.' })
    } else {
      showToast({ type: 'error', message: 'Failed to create workspace.' })
    }
  }

  const handleJoinWorkspace = async () => {
    const token = parseInviteToken(joinValue)
    if (!token) {
      showToast({ type: 'error', message: 'Invite token is required.' })
      return
    }
    const inviteAnswer = joinInviteQuestion ? joinInviteAnswer.trim() : ''
    if (joinInviteQuestion && !inviteAnswer) {
      showToast({ type: 'error', message: 'This invite requires an answer before joining.' })
      return
    }
    setWorkspaceBusy(true)
    const joined = await joinWorkspace(token, inviteAnswer || undefined)
    setWorkspaceBusy(false)
    if (joined?.id) {
      setJoinValue('')
      setJoinInviteQuestion('')
      setJoinInviteWorkspaceName('')
      setJoinInviteAnswer('')
      setJoinInviteResolving(false)
      lastResolvedJoinTokenRef.current = ''
      await refresh()
      showToast({
        type: joined.status === 'PENDING' ? 'info' : 'success',
        message: joined.status === 'PENDING' ? 'Join request sent for approval.' : 'Workspace joined.',
      })
    } else {
      showToast({ type: 'error', message: 'Failed to join workspace.' })
    }
  }

  const handleCreateInvite = async () => {
    if (!activeWorkspaceId) {
      showToast({ type: 'error', message: 'Select a workspace first.' })
      return
    }
    const days = Number.parseInt(inviteDays, 10)
    const maxUses = Number.parseInt(inviteMaxUses, 10)
    const expiresAt =
      Number.isFinite(days) && days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : undefined
    const maxUsesValue = Number.isFinite(maxUses) && maxUses > 0 ? maxUses : undefined
    const defaultRoleId = inviteDefaultRoleId || undefined
    const invitedEmail = inviteEmail.trim() || undefined
    const joinQuestion = inviteQuestion.trim() || undefined
    if (invitedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(invitedEmail)) {
      showToast({ type: 'error', message: 'Enter a valid invite email or leave it empty.' })
      return
    }
    if (joinQuestion && joinQuestion.length > 280) {
      showToast({ type: 'error', message: 'Join question must be up to 280 characters.' })
      return
    }
    try {
      await createInvite(activeWorkspaceId, { expiresAt, maxUses: maxUsesValue, defaultRoleId, invitedEmail, joinQuestion })
      await loadInvites(activeWorkspaceId)
      setInviteEmail('')
      setInviteQuestion('')
      showToast({ type: 'success', message: 'Invite created.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to create invite.' })
    }
  }

  const handleRevokeInvite = async (inviteId?: string | null) => {
    if (!activeWorkspaceId || !inviteId) return
    try {
      await revokeInvite(activeWorkspaceId, inviteId)
      await loadInvites(activeWorkspaceId)
      showToast({ type: 'success', message: 'Invite revoked.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to revoke invite.' })
    }
  }

  const handleCopy = async (value: string, label: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      showToast({ type: 'success', message: `${label} copied.` })
    } catch {
      showToast({ type: 'error', message: `Failed to copy ${label.toLowerCase()}.` })
    }
  }

  const handleToggleApproval = async (next: boolean) => {
    if (!activeWorkspaceId) return
    setSettingsBusy(true)
    try {
      await updateWorkspaceSettings(activeWorkspaceId, { requireApproval: next })
      await refresh()
      showToast({ type: 'success', message: 'Workspace settings updated.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to update workspace settings.' })
    } finally {
      setSettingsBusy(false)
    }
  }

  const handleApproveRequest = async (requestId?: string | null) => {
    if (!activeWorkspaceId || !requestId) return
    try {
      await approveJoinRequest(activeWorkspaceId, requestId)
      await loadRequests(activeWorkspaceId)
      showToast({ type: 'success', message: 'Request approved.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to approve request.' })
    }
  }

  const handleDenyRequest = async (requestId?: string | null) => {
    if (!activeWorkspaceId || !requestId) return
    try {
      await denyJoinRequest(activeWorkspaceId, requestId)
      await loadRequests(activeWorkspaceId)
      showToast({ type: 'success', message: 'Request denied.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to deny request.' })
    }
  }

  useEffect(() => {
    if (!activeWorkspaceId || !canInviteMembers) {
      setInvites([])
      return
    }
    loadInvites(activeWorkspaceId)
  }, [activeWorkspaceId, canInviteMembers, loadInvites])

  useEffect(() => {
    if (!roles.length) return
    const exists = inviteDefaultRoleId && roles.some((role) => role.id === inviteDefaultRoleId)
    if (!exists) {
      setInviteDefaultRoleId(defaultInviteRoleId)
    }
  }, [roles, inviteDefaultRoleId, defaultInviteRoleId])

  useEffect(() => {
    if (!activeWorkspaceId || !canApproveRequests) {
      setRequests([])
      return
    }
    loadRequests(activeWorkspaceId)
  }, [activeWorkspaceId, canApproveRequests, loadRequests])

  useEffect(() => {
    if (workspaceProfileTargetId && !workspaces.some((workspace) => workspace.id === workspaceProfileTargetId)) {
      setWorkspaceProfileTargetId(null)
    }
  }, [workspaceProfileTargetId, workspaces])

  useEffect(() => {
    setWorkspaceProfileName(profileWorkspace?.name ?? '')
    setWorkspaceProfileSlug(profileWorkspace?.slug ?? '')
    setWorkspaceProfileLanguage(profileWorkspace?.language ?? '')
    setWorkspaceProfileAvatarUrl(profileWorkspace?.avatarUrl ?? '')
    setWorkspaceProfileDescription(profileWorkspace?.description ?? '')
    setWorkspaceProfileMaxProjects(profileWorkspace?.maxProjects != null ? String(profileWorkspace.maxProjects) : '')
    setWorkspaceProfileMaxMembers(profileWorkspace?.maxMembers != null ? String(profileWorkspace.maxMembers) : '')
    setWorkspaceProfileMaxTeams(profileWorkspace?.maxTeams != null ? String(profileWorkspace.maxTeams) : '')
    setWorkspaceProfileMaxStorageMb(profileWorkspace?.maxStorageMb != null ? String(profileWorkspace.maxStorageMb) : '')
  }, [
    profileWorkspace?.id,
    profileWorkspace?.name,
    profileWorkspace?.slug,
    profileWorkspace?.language,
    profileWorkspace?.avatarUrl,
    profileWorkspace?.description,
    profileWorkspace?.maxProjects,
    profileWorkspace?.maxMembers,
    profileWorkspace?.maxTeams,
    profileWorkspace?.maxStorageMb,
  ])

  useEffect(() => {
    if (!activeWorkspaceId) {
      setRoles([])
      setMembers([])
      return
    }
    loadRoles(activeWorkspaceId)
    if (canManageRoles || canManageTeams) {
      loadMembers(activeWorkspaceId)
    } else {
      setMembers([])
    }
  }, [activeWorkspaceId, canManageRoles, canManageTeams, loadMembers, loadRoles])

  useEffect(() => {
    if (!activeWorkspaceId || !canViewAudit) {
      setAuditEvents([])
      return
    }
    loadAudit(activeWorkspaceId)
  }, [activeWorkspaceId, canViewAudit, loadAudit])

  useEffect(() => {
    if (!user?.id) {
      setNotificationPreferences(null)
      return
    }
    setNotificationBusy(true)
    getNotificationPreferences()
      .then((data) => {
        setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...data })
      })
      .catch(() => {
        showToast({ type: 'error', message: 'Failed to load notification preferences.' })
        setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES })
      })
      .finally(() => {
        setNotificationBusy(false)
      })
  }, [user?.id, showToast])

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported')
      return
    }
    setBrowserPermission(Notification.permission)
  }, [])

  const handleCreateTeam = async () => {
    if (!canCreateTeams) {
      setTeamError('Only workspace owner/manager can create a team.')
      return
    }
    const name = teamName.trim()
    if (name.length < 2 || name.length > 40) {
      setTeamError('Team name must be 2-40 characters.')
      return
    }
    const created = await createTeam(name, teamColor)
    if (created?.id) {
      setTeamName('')
      setTeamColor('#3B82F6')
      setTeamError(null)
      await refreshTeams()
      showToast({ type: 'success', message: 'Team created.' })
    } else {
      showToast({ type: 'error', message: 'Failed to create team.' })
    }
  }

  const handleStartEditTeam = (id?: string | null, name?: string | null, color?: string | null) => {
    if (!id) return
    setEditingTeamId(id)
    setEditingTeamName(name ?? '')
    setEditingTeamColor(color ?? '#3B82F6')
    setEditingTeamAction('rename')
    setTeamError(null)
  }

  const handleCancelOwnJoinRequest = async (workspaceId?: string | null) => {
    if (!workspaceId) return
    try {
      await cancelOwnJoinRequest(workspaceId)
      await refresh()
      if (activeWorkspaceId === workspaceId) {
        setActiveWorkspaceId(null)
      }
      showToast({ type: 'success', message: 'Join request canceled.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to cancel join request.' })
    }
  }

  const handleCancelEditTeam = () => {
    setEditingTeamId(null)
    setEditingTeamName('')
    setEditingTeamColor('#3B82F6')
    setEditingTeamAction(null)
    setTeamError(null)
  }

  const handleSaveTeam = async () => {
    if (!editingTeamId || !canEditTeams) return
    const name = editingTeamName.trim()
    if (name.length < 2 || name.length > 40) {
      setTeamError('Team name must be 2-40 characters.')
      return
    }
    const duplicate = teams.some(
      (team) => team.id !== editingTeamId && (team.name ?? '').trim().toLocaleLowerCase() === name.toLocaleLowerCase()
    )
    if (duplicate) {
      setTeamError('Team name already exists.')
      return
    }
    const updated = await updateTeam(editingTeamId, { name, color: editingTeamColor })
    if (updated?.id) {
      handleCancelEditTeam()
      await refreshTeams()
      showToast({ type: 'success', message: 'Team updated.' })
    } else {
      setTeamError('Failed to update team. Check permissions or try a different name.')
      showToast({ type: 'error', message: 'Failed to update team.' })
    }
  }

  const handleSaveWorkspaceProfile = async () => {
    if (!workspaceProfileTargetId || !canEditSelectedProfile) return
    const trimmedName = workspaceProfileName.trim()
    if (!trimmedName) {
      showToast({ type: 'error', message: 'Workspace name is required.' })
      return
    }
    const trimmedSlug = workspaceProfileSlug.trim()
    const trimmedLanguage = workspaceProfileLanguage.trim()
    const trimmedAvatarUrl = workspaceProfileAvatarUrl.trim()
    const trimmedDescription = workspaceProfileDescription.trim()
    const normalizedMaxProjects = workspaceProfileMaxProjects.trim() === '' ? null : Number.parseInt(workspaceProfileMaxProjects, 10)
    const normalizedMaxMembers = workspaceProfileMaxMembers.trim() === '' ? null : Number.parseInt(workspaceProfileMaxMembers, 10)
    const normalizedMaxTeams = workspaceProfileMaxTeams.trim() === '' ? null : Number.parseInt(workspaceProfileMaxTeams, 10)
    const normalizedMaxStorageMb = workspaceProfileMaxStorageMb.trim() === '' ? null : Number.parseInt(workspaceProfileMaxStorageMb, 10)
    if ([normalizedMaxProjects, normalizedMaxMembers, normalizedMaxTeams, normalizedMaxStorageMb].some((v) => v != null && (!Number.isFinite(v) || v < 0))) {
      showToast({ type: 'error', message: 'Workspace limits must be positive numbers (or empty for unlimited).' })
      return
    }
    const currentName = (profileWorkspace?.name ?? '').trim()
    const currentSlug = (profileWorkspace?.slug ?? '').trim()
    const currentLanguage = (profileWorkspace?.language ?? '').trim()
    const currentAvatarUrl = (profileWorkspace?.avatarUrl ?? '').trim()
    const currentDescription = (profileWorkspace?.description ?? '').trim()
    const currentMaxProjects = profileWorkspace?.maxProjects ?? null
    const currentMaxMembers = profileWorkspace?.maxMembers ?? null
    const currentMaxTeams = profileWorkspace?.maxTeams ?? null
    const currentMaxStorageMb = profileWorkspace?.maxStorageMb ?? null
    const payload: {
      name?: string
      slug?: string
      language?: string
      avatarUrl?: string
      description?: string
      maxProjects?: number | null
      maxMembers?: number | null
      maxTeams?: number | null
      maxStorageMb?: number | null
    } = {}
    if (trimmedName !== currentName) payload.name = trimmedName
    if (trimmedSlug && trimmedSlug !== currentSlug) payload.slug = trimmedSlug
    if (trimmedLanguage !== currentLanguage) payload.language = trimmedLanguage || ''
    if (trimmedAvatarUrl !== currentAvatarUrl) payload.avatarUrl = trimmedAvatarUrl || ''
    if (trimmedDescription !== currentDescription) payload.description = trimmedDescription
    if (normalizedMaxProjects !== currentMaxProjects) payload.maxProjects = normalizedMaxProjects
    if (normalizedMaxMembers !== currentMaxMembers) payload.maxMembers = normalizedMaxMembers
    if (normalizedMaxTeams !== currentMaxTeams) payload.maxTeams = normalizedMaxTeams
    if (normalizedMaxStorageMb !== currentMaxStorageMb) payload.maxStorageMb = normalizedMaxStorageMb
    if (Object.keys(payload).length === 0) {
      showToast({ type: 'success', message: 'No profile changes to save.' })
      return
    }
    setSettingsBusy(true)
    try {
      await updateWorkspaceSettings(workspaceProfileTargetId, payload)
      await refresh()
      showToast({ type: 'success', message: 'Workspace profile updated.' })
    } catch (err) {
      const message = isApiError(err) ? err.message : err instanceof Error ? err.message : 'Failed to update workspace profile.'
      showToast({ type: 'error', message: message || 'Failed to update workspace profile.' })
    } finally {
      setSettingsBusy(false)
    }
  }

  const handleUploadWorkspaceProfileAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      showToast({ type: 'error', message: 'Use PNG/JPG/WEBP for avatar.' })
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast({ type: 'error', message: 'Avatar max size is 2MB.' })
      event.target.value = ''
      return
    }
    setWorkspaceAvatarCropFile(file)
    setWorkspaceAvatarCropPreviewUrl(URL.createObjectURL(file))
    setWorkspaceAvatarCropX(50)
    setWorkspaceAvatarCropY(50)
    setWorkspaceAvatarCropZoom(100)
    setWorkspaceAvatarCropSourceUrl(null)
    event.target.value = ''
  }

  const handleApplyWorkspaceAvatarCrop = async () => {
    if (!workspaceAvatarCropFile) return
    try {
      setWorkspaceProfileAvatarUploading(true)
      let nextAvatarUrl = workspaceAvatarCropSourceUrl?.trim() ?? ''
      if (!nextAvatarUrl) {
        // Frame-mode behavior: upload original image and persist POV separately.
        const uploaded = await uploadImage(workspaceAvatarCropFile)
        nextAvatarUrl = (uploaded.url ?? '').trim()
      }
      setWorkspaceProfileAvatarUrl(nextAvatarUrl)
      if (nextAvatarUrl) {
        setSavedWorkspaceCropByUrl((prev) => ({
          ...prev,
          [nextAvatarUrl]: { x: workspaceAvatarCropX, y: workspaceAvatarCropY, zoom: workspaceAvatarCropZoom },
        }))
      }
      if (!workspaceProfileTargetId || !canEditSelectedProfile) {
        showToast({ type: 'success', message: 'Avatar uploaded.' })
      } else {
        setSettingsBusy(true)
        try {
          await updateWorkspaceSettings(workspaceProfileTargetId, { avatarUrl: nextAvatarUrl })
          await refresh()
          showToast({ type: 'success', message: 'Workspace avatar updated.' })
        } catch (err) {
          const message = isApiError(err)
            ? err.message
            : err instanceof Error
              ? err.message
              : 'Failed to update workspace avatar.'
          showToast({ type: 'error', message })
        } finally {
          setSettingsBusy(false)
        }
      }
      URL.revokeObjectURL(workspaceAvatarCropPreviewUrl)
      setWorkspaceAvatarCropPreviewUrl('')
      setWorkspaceAvatarCropFile(null)
      setWorkspaceAvatarCropSourceUrl(null)
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to upload avatar.' })
    } finally {
      setWorkspaceProfileAvatarUploading(false)
    }
  }

  const handleApplyWorkspaceAvatarFromLink = async () => {
    if (!workspaceProfileTargetId || !canEditSelectedProfile) return
    const nextAvatarUrl = workspaceProfileAvatarUrl.trim()
    setSettingsBusy(true)
    try {
      await updateWorkspaceSettings(workspaceProfileTargetId, { avatarUrl: nextAvatarUrl })
      await refresh()
      showToast({ type: 'success', message: 'Workspace avatar updated.' })
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to update workspace avatar.'
      showToast({ type: 'error', message })
    } finally {
      setSettingsBusy(false)
    }
  }

  const handleDeleteWorkspaceAvatar = async () => {
    if (!workspaceProfileTargetId || !canEditSelectedProfile) return
    setWorkspaceProfileAvatarUrl('')
    setSettingsBusy(true)
    try {
      await updateWorkspaceSettings(workspaceProfileTargetId, { avatarUrl: '' })
      await refresh()
      showToast({ type: 'success', message: 'Workspace avatar removed.' })
    } catch (err) {
      const message = isApiError(err)
        ? err.message
        : err instanceof Error
          ? err.message
          : 'Failed to remove workspace avatar.'
      showToast({ type: 'error', message })
    } finally {
      setSettingsBusy(false)
    }
  }

  const handleOpenWorkspaceCropFromCurrentPhoto = async () => {
    const currentUrl = workspaceProfileAvatarUrl.trim()
    if (!currentUrl) return
    try {
      const response = await fetch(resolveAssetUrl(currentUrl), { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Could not load current workspace photo for crop.')
      }
      const blob = await response.blob()
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
      const file = new File([blob], `workspace-picture.${extension}`, { type: blob.type || 'image/jpeg' })
      setWorkspaceAvatarCropFile(file)
      setWorkspaceAvatarCropPreviewUrl(URL.createObjectURL(file))
      const saved = savedWorkspaceCropByUrl[currentUrl]
      setWorkspaceAvatarCropX(saved?.x ?? 50)
      setWorkspaceAvatarCropY(saved?.y ?? 50)
      setWorkspaceAvatarCropZoom(saved?.zoom ?? 100)
      setWorkspaceAvatarCropSourceUrl(currentUrl)
    } catch (err) {
      showToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to open crop editor.' })
    }
  }

  useEffect(() => {
    if (!editingTeamId) return
    if (!canEditTeams || !teams.some((team) => team.id === editingTeamId)) {
      handleCancelEditTeam()
    }
  }, [canEditTeams, editingTeamId, teams])

  useEffect(() => {
    let active = true
    fetch('/profile-pictures/index.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return
        const files = Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
        setPmdImages(files)
      })
      .catch(() => {
        if (active) setPmdImages([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (workspaceAvatarCropPreviewUrl) {
        URL.revokeObjectURL(workspaceAvatarCropPreviewUrl)
      }
    }
  }, [workspaceAvatarCropPreviewUrl])

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_CROP_STORAGE_KEY, JSON.stringify(savedWorkspaceCropByUrl))
    } catch {
      // ignore storage errors
    }
  }, [savedWorkspaceCropByUrl])

  const handleWorkspaceCropPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!workspaceAvatarCropPreviewUrl) return
    workspaceCropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: workspaceAvatarCropX,
      baseY: workspaceAvatarCropY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleWorkspaceCropPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const state = workspaceCropDragRef.current
    if (!state) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const frameSize = Math.max(1, event.currentTarget.getBoundingClientRect().width)
    const step = 100 / frameSize
    const nextX = Math.max(0, Math.min(100, state.baseX - dx * step))
    const nextY = Math.max(0, Math.min(100, state.baseY - dy * step))
    setWorkspaceAvatarCropX(nextX)
    setWorkspaceAvatarCropY(nextY)
  }

  const handleWorkspaceCropPointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (workspaceCropDragRef.current) {
      workspaceCropDragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleWorkspaceCropWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -4 : 4
    setWorkspaceAvatarCropZoom((prev) => Math.max(100, Math.min(220, prev + delta)))
  }

  useEffect(() => {
    if (!editingRoleId) return
    if (!canEditRoles || !roles.some((role) => role.id === editingRoleId)) {
      handleCancelEditRole()
    }
  }, [canEditRoles, editingRoleId, roles])

  const handleToggleTeamActive = async (teamId?: string | null, nextActive?: boolean) => {
    if (!teamId) return
    const updated = await updateTeam(teamId, { isActive: nextActive ?? false })
    if (updated?.id) {
      await refreshTeams()
      showToast({ type: "success", message: updated.isActive === false ? "Team deactivated." : "Team restored." })
    } else {
      showToast({ type: "error", message: "Failed to update team." })
    }
  }

  const handleConfirmTeamAction = async (teamId?: string | null, currentActive?: boolean | null) => {
    if (!teamId || !editingTeamAction || !canEditTeams) return
    if (editingTeamAction === 'rename') {
      await handleSaveTeam()
      return
    }
    if (editingTeamAction === 'delete') {
      await handleToggleTeamActive(teamId, false)
      handleCancelEditTeam()
      return
    }
    if (editingTeamAction === 'toggle') {
      await handleToggleTeamActive(teamId, !(currentActive ?? true))
      handleCancelEditTeam()
    }
  }

  const normalizePermissions = useCallback((value?: WorkspacePermissions | null) => {
    return {
      ...DEFAULT_ROLE_PERMISSIONS,
      ...(value ?? {}),
    }
  }, [])

  const handleStartEditRole = (role: WorkspaceRole) => {
    if (!role.id) return
    setEditingRoleId(role.id)
    setEditingRoleName(role.name ?? '')
    setEditingRolePermissions(normalizePermissions(role.permissions))
    setEditingRoleAction(null)
  }

  const handleCancelEditRole = () => {
    setEditingRoleId(null)
    setEditingRoleName('')
    setEditingRolePermissions({ ...DEFAULT_ROLE_PERMISSIONS })
    setEditingRoleAction(null)
  }

  const handleCreateRole = async () => {
    if (!activeWorkspaceId) return
    if (customRolesLimitReached) {
      showToast({ type: 'error', message: 'Custom role limit reached (10 per workspace).' })
      return
    }
    const name = roleName.trim()
    if (name.length < 2 || name.length > 40) {
      showToast({ type: 'error', message: 'Role name must be 2-40 characters.' })
      return
    }
    try {
      await createRole(activeWorkspaceId, { name, permissions: rolePermissions })
      setRoleName('')
      setRolePermissions({ ...DEFAULT_ROLE_PERMISSIONS })
      await loadRoles(activeWorkspaceId)
      showToast({ type: 'success', message: 'Role created.' })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to create role.')
      if (isForbiddenError(err)) {
        setRolesError('You no longer have permission to manage roles in this workspace.')
        await refresh()
      }
      showToast({ type: 'error', message })
    }
  }

  const handleSaveRole = async () => {
    if (!activeWorkspaceId || !editingRoleId) return
    const name = editingRoleName.trim()
    if (editingRole?.system && editingRole.name && name.toLocaleLowerCase() !== editingRole.name.toLocaleLowerCase()) {
      showToast({ type: 'error', message: 'System/demo role name cannot be changed.' })
      return
    }
    if (name.length < 2 || name.length > 40) {
      showToast({ type: 'error', message: 'Role name must be 2-40 characters.' })
      return
    }
    try {
      await updateRole(activeWorkspaceId, editingRoleId, {
        name,
        permissions: editingRolePermissions,
      })
      handleCancelEditRole()
      await loadRoles(activeWorkspaceId)
      showToast({ type: 'success', message: 'Role updated.' })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update role.')
      setRolesError(message)
      showToast({ type: 'error', message })
    }
  }

  const handleResetRoleDefaults = async () => {
    if (!activeWorkspaceId || !editingRoleId || !editingRole?.system) return
    try {
      const defaults = getSystemRoleDefaults(editingRole.name)
      await updateRole(activeWorkspaceId, editingRoleId, {
        permissions: defaults,
      })
      setEditingRolePermissions(defaults)
      await loadRoles(activeWorkspaceId)
      showToast({ type: 'success', message: 'Demo role permissions reset.' })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to reset role defaults.')
      setRolesError(message)
      showToast({ type: 'error', message })
    }
  }

  const handleConfirmRoleAction = async () => {
    if (!editingRoleAction) return
    if (editingRoleAction === 'reset') {
      await handleResetRoleDefaults()
      return
    }
    await handleSaveRole()
  }

  const handleAssignRole = async () => {
    if (!activeWorkspaceId || !assignUserId || !assignRoleId) return
    try {
      await assignMemberRole(activeWorkspaceId, assignUserId, assignRoleId)
      setAssignUserId('')
      setAssignRoleId('')
      await loadMembers(activeWorkspaceId)
      await refresh()
      showToast({ type: 'success', message: 'Role assigned.' })
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to assign role.')
      setRolesError(message)
      showToast({ type: 'error', message })
    }
  }

  const toggleRolePermission = (
    current: WorkspacePermissions,
    key: keyof WorkspacePermissions
  ): WorkspacePermissions => {
    return {
      ...current,
      [key]: !current?.[key],
    }
  }

  const handleNotificationToggle = async (key: keyof NotificationPreferences, nextValue: boolean) => {
    if (!notificationPreferences) return
    const previous = notificationPreferences
    const next = { ...notificationPreferences, [key]: nextValue }
    setNotificationPreferences(next)
    setNotificationBusy(true)
    try {
      const saved = await updateNotificationPreferences(next)
      setNotificationPreferences({ ...DEFAULT_NOTIFICATION_PREFERENCES, ...saved })
      showToast({ type: 'success', message: 'Notification preferences saved.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to save notification preferences.' })
      setNotificationPreferences(previous)
    } finally {
      setNotificationBusy(false)
    }
  }

  const handleEnableBrowserNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast({ type: 'error', message: 'Browser notifications are not supported.' })
      return
    }
    try {
      const result = await Notification.requestPermission()
      setBrowserPermission(result)
      showToast({
        type: result === 'granted' ? 'success' : 'info',
        message: result === 'granted' ? 'Browser notifications enabled.' : 'Browser notifications not granted.',
      })
    } catch {
      showToast({ type: 'error', message: 'Failed to request browser notification permission.' })
    }
  }

  useEffect(() => {
    if (!activeResize) return
    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientY - activeResize.startY
      const rawHeight = activeResize.edge === 'bottom' ? activeResize.startHeight + delta : activeResize.startHeight - delta
      const nextHeight = clampPanelHeight(activeResize.id, rawHeight)
      setPanelHeights((prev) => ({ ...prev, [activeResize.id]: nextHeight }))
    }
    const handleMouseUp = () => setActiveResize(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeResize, clampPanelHeight])

  useEffect(() => {
    if (settingsViewMode !== 'grid') return
    if (activeResize || draggingPanel) return
    SETTINGS_PANEL_IDS.forEach((id) => scheduleFitPanel(id))
  }, [settingsViewMode, activeResize, draggingPanel, panelOrder, scheduleFitPanel])

  useEffect(() => {
    const nextMode: SettingsViewMode = preferences.settingsDefaultView === 'tabs' ? 'tabs' : 'grid'
    setSettingsViewMode(nextMode)
  }, [preferences.settingsDefaultView])

  // Safety net: re-fit panels after any render (async data / toggles / conditional blocks)
  // so content never spills outside cards when grid auto-resize is disabled.
  useEffect(() => {
    if (settingsViewMode !== 'grid') return
    if (activeResize || draggingPanel) return
    SETTINGS_PANEL_IDS.forEach((id) => scheduleFitPanel(id))
  })

  useEffect(() => {
    if (settingsViewMode !== 'grid') return
    if (preferences.settingsGridResizeEnabled) return
    setActiveResize(null)
  }, [preferences.settingsGridResizeEnabled, settingsViewMode])

  useEffect(() => {
    if (settingsViewMode !== 'grid') return
    if (activeResize || draggingPanel) return
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLElement
        const panelId = element.dataset.panelId as SettingsPanelId | undefined
        if (!panelId) return
        scheduleFitPanel(panelId)
      })
    })
    SETTINGS_PANEL_IDS.forEach((id) => {
      const card = panelRefs.current[id]
      if (!card) return
      observer.observe(card)
    })
    const pendingPanels = pendingFitPanelsRef.current
    return () => {
      observer.disconnect()
      if (fitRafRef.current != null) {
        window.cancelAnimationFrame(fitRafRef.current)
        fitRafRef.current = null
      }
      pendingPanels.clear()
    }
  }, [activeResize, draggingPanel, scheduleFitPanel, settingsViewMode])

  useEffect(() => {
    if (!orderMenuPanel) return
    const handleDocumentClick = () => setOrderMenuPanel(null)
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOrderMenuPanel(null)
      }
    }
    window.addEventListener('click', handleDocumentClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('click', handleDocumentClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [orderMenuPanel])

  useEffect(() => {
    pendingGridBoundsRef.current = settingsGridBounds
  }, [settingsGridBounds])

  useEffect(() => {
    return () => {
      if (gridBoundsRafRef.current != null) {
        window.cancelAnimationFrame(gridBoundsRafRef.current)
        gridBoundsRafRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const onPointerUp = () => {
      if (suspendGridAutoFitRef.current) {
        releaseGridBoundsDrag()
      }
    }
    window.addEventListener('pointerup', onPointerUp)
    return () => window.removeEventListener('pointerup', onPointerUp)
  }, [releaseGridBoundsDrag])

  useEffect(() => {
    if (!openInviteMenuId) return
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (!target?.closest('.invite-menu-wrap')) {
        setOpenInviteMenuId(null)
      }
    }
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenInviteMenuId(null)
      }
    }
    window.addEventListener('click', onClick)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('click', onClick)
      window.removeEventListener('keydown', onEsc)
    }
  }, [openInviteMenuId])

  useEffect(() => {
    if (settingsViewMode === 'tabs') {
      setPanelRowSpans({
        preferences: 1,
        workspaces: 1,
        teams: 1,
        notifications: 1,
        roles: 1,
        audit: 1,
      })
      return
    }
    const grid = document.querySelector('.settings-grid') as HTMLElement | null
    if (!grid) return
    const styles = window.getComputedStyle(grid)
    const rowHeight = Number.parseFloat(styles.getPropertyValue('grid-auto-rows')) || 8
    const rowGap = Number.parseFloat(styles.getPropertyValue('row-gap')) || 16
    const nextSpans: Record<SettingsPanelId, number> = {
      preferences: 1,
      workspaces: 1,
      teams: 1,
      notifications: 1,
      roles: 1,
      audit: 1,
    }
    SETTINGS_PANEL_IDS.forEach((id) => {
      const height = panelHeights[id]
      const span = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)))
      nextSpans[id] = span
    })
    setPanelRowSpans((prev) => {
      const changed = SETTINGS_PANEL_IDS.some((id) => prev[id] !== nextSpans[id])
      return changed ? nextSpans : prev
    })
  }, [panelHeights, panelOrder, draggingPanel, dragOverPanel, settingsViewMode])

  const isTabVisible = useCallback(
    (id: SettingsPanelId) => settingsViewMode === 'grid' || activeTabPanel === id,
    [activeTabPanel, settingsViewMode]
  )

  const handlePanelDragStart = useCallback(
    (id: SettingsPanelId) =>
      (event: DragEvent<HTMLElement>) => {
        setDraggingPanel(id)
        setOrderMenuPanel(null)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', id)
      },
    []
  )

  const handlePanelDragOver = useCallback(
    (targetId: SettingsPanelId | 'end') =>
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDragOverPanel(targetId)
      },
    []
  )

  const handlePanelDrop = useCallback(
    (targetId: SettingsPanelId | 'end') =>
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const sourceId = (event.dataTransfer.getData('text/plain') || draggingPanel) as SettingsPanelId | null
        if (sourceId && sourceId !== targetId) {
          movePanel(sourceId, targetId)
        }
        setDraggingPanel(null)
        setDragOverPanel(null)
      },
    [draggingPanel, movePanel]
  )

  const openOrderMenu = useCallback(
    (id: SettingsPanelId) => {
      setOrderMenuPanel((prev) => (prev === id ? null : id))
      setOrderTargetPosition(panelOrder.indexOf(id) + 1)
    },
    [panelOrder]
  )

  const applyOrderMove = useCallback(
    (id: SettingsPanelId) => {
      movePanelToPosition(id, orderTargetPosition)
      setOrderMenuPanel(null)
    },
    [movePanelToPosition, orderTargetPosition]
  )

  const renderOrderControl = (id: SettingsPanelId, label: string) => (
    <div className="settings-order-control">
      <button
        type="button"
        className="settings-drag-icon"
        draggable
        onDragStart={handlePanelDragStart(id)}
        onDragEnd={() => {
          setDraggingPanel(null)
          setDragOverPanel(null)
        }}
        onClick={(event) => {
          event.stopPropagation()
          openOrderMenu(id)
        }}
        title="Drag to reorder or click to set position"
        aria-label={`Reorder ${label} panel`}
      >
        ::
      </button>
      {orderMenuPanel === id ? (
        <div
          className={`settings-order-popover${settingsViewMode === 'grid' ? ' settings-order-popover-grid' : ''}`}
          onClick={(event) => event.stopPropagation()}
        >
          <label htmlFor={`panel-order-${id}`}>Position</label>
          <div className="settings-order-row">
            <select
              id={`panel-order-${id}`}
              value={orderTargetPosition}
              onChange={(event) => setOrderTargetPosition(Number(event.target.value))}
            >
              {panelOrder.map((_, index) => (
                <option key={`${id}-pos-${index + 1}`} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-secondary" onClick={() => applyOrderMove(id)}>
              Move
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOrderMenuPanel(null)}>
              Close
            </button>
          </div>
          {settingsViewMode === 'grid' ? (
            <div className="settings-order-grid-controls">
              <label htmlFor={`grid-col-1-${id}`}>Grid col 1</label>
              <input
                id={`grid-col-1-${id}`}
                type="range"
                min={320}
                max={720}
                value={settingsGridBounds.col1}
                onPointerDown={() => {
                  suspendGridAutoFitRef.current = true
                }}
                onPointerUp={releaseGridBoundsDrag}
                onPointerCancel={releaseGridBoundsDrag}
                onChange={(event) => updateGridBounds('col1', Number(event.target.value))}
              />
              <label htmlFor={`grid-col-2-${id}`}>Grid col 2</label>
              <input
                id={`grid-col-2-${id}`}
                type="range"
                min={260}
                max={560}
                value={settingsGridBounds.col2}
                onPointerDown={() => {
                  suspendGridAutoFitRef.current = true
                }}
                onPointerUp={releaseGridBoundsDrag}
                onPointerCancel={releaseGridBoundsDrag}
                onChange={(event) => updateGridBounds('col2', Number(event.target.value))}
              />
              <label htmlFor={`grid-col-3-${id}`}>Grid col 3</label>
              <input
                id={`grid-col-3-${id}`}
                type="range"
                min={260}
                max={560}
                value={settingsGridBounds.col3}
                onPointerDown={() => {
                  suspendGridAutoFitRef.current = true
                }}
                onPointerUp={releaseGridBoundsDrag}
                onPointerCancel={releaseGridBoundsDrag}
                onChange={(event) => updateGridBounds('col3', Number(event.target.value))}
              />
              <label htmlFor={`grid-gap-${id}`}>Gap</label>
              <input
                id={`grid-gap-${id}`}
                type="range"
                min={8}
                max={28}
                value={settingsGridBounds.gap}
                onPointerDown={() => {
                  suspendGridAutoFitRef.current = true
                }}
                onPointerUp={releaseGridBoundsDrag}
                onPointerCancel={releaseGridBoundsDrag}
                onChange={(event) => updateGridBounds('gap', Number(event.target.value))}
              />
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settingsGridBounds.showGuides}
                  onChange={(event) =>
                    setSettingsGridBounds((prev) => ({ ...prev, showGuides: event.target.checked }))
                  }
                />
                <span>Show bounds</span>
              </label>
              <button
                type="button"
                className="btn btn-secondary team-edit-trigger"
                onClick={() => {
                  pendingGridBoundsRef.current = DEFAULT_SETTINGS_GRID_BOUNDS
                  setSettingsGridBounds(DEFAULT_SETTINGS_GRID_BOUNDS)
                  releaseGridBoundsDrag()
                }}
              >
                Reset default
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )


  return (
    <section
      ref={(node) => {
        settingsPanelRootRef.current = node
      }}
      className={`panel settings-page-panel${gridResizeEnabled ? '' : ' settings-resize-disabled'}`}
    >
      <div className="panel-header">
        <div>
          <h2>Settings</h2>
        </div>
        <div className="settings-view-switch">
          <button
            type="button"
            className={`btn btn-secondary settings-view-icon-btn${settingsViewMode === 'grid' ? ' assign-toggle is-active' : ''}`}
            onClick={() => setSettingsViewMode('grid')}
            title="Grid view"
            aria-label="Grid view"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" className="settings-view-icon-svg" aria-hidden="true">
              <rect x="3" y="3" width="8" height="8" rx="1.4" fill="currentColor" />
              <rect x="13" y="3" width="8" height="8" rx="1.4" fill="currentColor" />
              <rect x="3" y="13" width="8" height="8" rx="1.4" fill="currentColor" />
              <rect x="13" y="13" width="8" height="8" rx="1.4" fill="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className={`btn btn-secondary settings-view-icon-btn${settingsViewMode === 'tabs' ? ' assign-toggle is-active' : ''}`}
            onClick={() => setSettingsViewMode('tabs')}
            title="Tab view"
            aria-label="Tab view"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" className="settings-view-icon-svg" aria-hidden="true">
              <rect x="3" y="4" width="18" height="3" rx="1.2" fill="currentColor" />
              <rect x="3" y="10.5" width="18" height="3" rx="1.2" fill="currentColor" />
              <rect x="3" y="17" width="18" height="3" rx="1.2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      {settingsViewMode === 'tabs' ? (
        <div className="settings-tabs-bar" data-tour="settings-tabs-bar">
          {SETTINGS_PANEL_IDS.map((id) => (
            <button
              key={`tab-${id}`}
              type="button"
              className={`btn btn-secondary${activeTabPanel === id ? ' assign-toggle is-active' : ''}`}
              onClick={() => setActiveTabPanel(id)}
            >
              <span className="settings-tab-icon">{SETTINGS_PANEL_ICONS[id]}</span>
              {SETTINGS_PANEL_LABELS[id]}
            </button>
          ))}
        </div>
      ) : null}
      <div
        className={`settings-grid${settingsViewMode === 'tabs' ? ' settings-tabs-mode' : ''}${settingsViewMode === 'grid' && settingsGridBounds.showGuides ? ' settings-grid-guides' : ''}`}
        style={settingsGridStyle}
      >
        <div
          className={`card settings-card settings-card-compact${dragOverPanel === 'preferences' ? ' is-drop-target' : ''}${isTabVisible('preferences') ? '' : ' settings-card-hidden'}`}
          data-panel-id="preferences"
          ref={setPanelRef('preferences')}
          style={panelCardStyle('preferences')}
          onDragOver={handlePanelDragOver('preferences')}
          onDrop={handlePanelDrop('preferences')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'preferences' ? null : prev))}
        >
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle top" onMouseDown={handleResizeStart('preferences', 'top')} />
          ) : null}
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Preferences</h3>
            </div>
            {settingsViewMode === 'grid' ? renderOrderControl('preferences', 'Preferences') : null}
          </div>
          <div className={`settings-card-body roles-layout${settingsViewMode === 'tabs' ? ' roles-layout-tabs' : ''}`}>
            <div className="workspace-group roles-list-group">
              <div className="settings-tab-two-col">
                <div className="settings-tab-main">
                  <div className="form-field">
                    <label htmlFor="prefDefaultLanding">Default landing page</label>
                    <select
                      id="prefDefaultLanding"
                      value={preferences.defaultLandingPage}
                      onChange={(event) =>
                        onChange({
                          ...preferences,
                          defaultLandingPage: event.target.value as typeof preferences.defaultLandingPage,
                        })
                      }
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="assign">Assign</option>
                      <option value="people">People</option>
                      <option value="settings">Settings</option>
                      <option value="lastVisited">Last visited route</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="prefSettingsDefaultView">Default settings view</label>
                    <select
                      id="prefSettingsDefaultView"
                      value={preferences.settingsDefaultView}
                      onChange={(event) => {
                        const nextView = (event.target.value === 'tabs' ? 'tabs' : 'grid') as UiPreferences['settingsDefaultView']
                        onChange({
                          ...preferences,
                          settingsDefaultView: nextView,
                        })
                        setSettingsViewMode(nextView)
                      }}
                    >
                      <option value="grid">Grid view</option>
                      <option value="tabs">Tab view</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.rememberDashboardProject}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            rememberDashboardProject: event.target.checked,
                          })
                        }
                      />
                      <span>Remember selected project on Dashboard</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.rememberAssignProject}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            rememberAssignProject: event.target.checked,
                          })
                        }
                      />
                      <span>Remember selected project on Assign</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.rememberPeopleSelection}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            rememberPeopleSelection: event.target.checked,
                          })
                        }
                      />
                      <span>Remember selections on People</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.confirmDestructiveActions}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            confirmDestructiveActions: event.target.checked,
                          })
                        }
                      />
                      <span>Confirm destructive actions</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.keyboardShortcutsEnabled}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            keyboardShortcutsEnabled: event.target.checked,
                          })
                        }
                      />
                      <span>Enable keyboard shortcuts</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.requireTeamOnProjectCreate}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            requireTeamOnProjectCreate: event.target.checked,
                          })
                        }
                      />
                      <span>Require team when creating project</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.settingsGridResizeEnabled}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            settingsGridResizeEnabled: event.target.checked,
                          })
                        }
                      />
                      <span>Enable settings grid panel resize</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label htmlFor="prefDateTimeFormat">Date/time format</label>
                    <select
                      id="prefDateTimeFormat"
                      value={preferences.dateTimeFormat}
                      onChange={(event) =>
                        onChange({
                          ...preferences,
                          dateTimeFormat: event.target.value as typeof preferences.dateTimeFormat,
                        })
                      }
                    >
                      <option value="24h">24-hour</option>
                      <option value="12h">12-hour</option>
                    </select>
                  </div>
                </div>
                <div className="settings-tab-side">
                  <button
                    type="button"
                    className="coming-soon-toggle"
                    onClick={() => toggleComingSoon('preferences')}
                    aria-expanded={comingSoonExpanded.preferences}
                  >
                    <span>Coming soon</span>
                    <span className={`coming-soon-chevron${comingSoonExpanded.preferences ? ' is-open' : ''}`} aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {comingSoonExpanded.preferences ? (
                    <>
                      <div className="form-field coming-soon-control" title="Coming soon">
                        <label className="checkbox-row">
                          <input type="checkbox" checked={preferences.compactMode} disabled />
                          <span>Compact mode</span>
                        </label>
                        <span className="pill coming-soon-pill">Soon</span>
                      </div>
                      <div className="form-field coming-soon-control" title="Coming soon">
                        <label className="checkbox-row">
                          <input type="checkbox" checked={preferences.rememberOpenPanels} disabled />
                          <span>Remember open panels</span>
                        </label>
                        <span className="pill coming-soon-pill">Soon</span>
                      </div>
                      <div className="form-field coming-soon-control" title="Coming soon">
                        <label className="checkbox-row">
                          <input type="checkbox" checked={preferences.defaultFiltersPreset} disabled />
                          <span>Default filters preset</span>
                        </label>
                        <span className="pill coming-soon-pill">Soon</span>
                      </div>
                      <div className="form-field coming-soon-control" title="Coming soon">
                        <label htmlFor="prefAutoRefresh">Auto-refresh interval</label>
                        <select id="prefAutoRefresh" value={preferences.autoRefreshIntervalSeconds} disabled>
                          <option value={0}>Off</option>
                          <option value={30}>30s</option>
                          <option value={60}>60s</option>
                        </select>
                        <span className="pill coming-soon-pill">Soon</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('preferences', 'bottom')} />
          ) : null}
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'workspaces' ? ' is-drop-target' : ''}${isTabVisible('workspaces') ? '' : ' settings-card-hidden'}`}
          data-panel-id="workspaces"
          data-tour="settings-workspaces-card"
          ref={setPanelRef('workspaces')}
          style={panelCardStyle('workspaces')}
          onDragOver={handlePanelDragOver('workspaces')}
          onDrop={handlePanelDrop('workspaces')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'workspaces' ? null : prev))}
        >
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle top" onMouseDown={handleResizeStart('workspaces', 'top')} />
          ) : null}
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Workspaces</h3>
            </div>
            {settingsViewMode === 'grid' ? renderOrderControl('workspaces', 'Workspaces') : null}
          </div>
          <div className="settings-card-body">
            <div className={`workspace-main-layout${settingsViewMode === 'tabs' ? ' workspace-main-layout-tabs' : ''}`}>
              <div className="workspace-group workspace-section-your">
                <div className="workspace-group-header">
                  <h4>Your workspaces</h4>
                </div>
                {listedWorkspaces.length > 0 ? (
                  <div className="workspace-list compact settings-scroll">
                    {listedWorkspaces.map((workspace) => (
                      <div key={workspace.id ?? workspace.name} className="workspace-edit-block">
                        <div
                          className="workspace-item compact workspace-item-clickable"
                          onClick={() => (workspace.id ? setActiveWorkspaceId(workspace.id) : undefined)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if ((event.key === 'Enter' || event.key === ' ') && workspace.id) {
                              event.preventDefault()
                              setActiveWorkspaceId(workspace.id)
                            }
                          }}
                          aria-label={`Open workspace ${workspace.name ?? 'Untitled'}`}
                        >
                          <div className="workspace-name truncate" title={workspace.name ?? ''}>
                            {workspace.name ?? 'Untitled'}
                          </div>
                          <div className="workspace-badges">
                            {workspace.demo ? <span className="pill">Demo</span> : null}
                            {workspace.status === 'PENDING' ? <span className="pill">Pending</span> : null}
                            {activeWorkspace?.id === workspace.id ? <span className="pill">Current</span> : null}
                            {isWorkspaceCreator(workspace) ? <span className="pill">Creator</span> : null}
                            {workspace.status === 'PENDING' && workspace.id ? (
                              <button
                                type="button"
                                className="btn btn-secondary team-edit-trigger"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  void handleCancelOwnJoinRequest(workspace.id)
                                }}
                              >
                                Cancel
                              </button>
                            ) : null}
                            {workspace.id && canEditWorkspaceProfileFor(workspace) ? (
                              <button
                                type="button"
                                className="btn btn-secondary team-edit-trigger"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setWorkspaceProfileTargetId((prev) => (prev === workspace.id ? null : workspace.id ?? null))
                                }}
                              >
                                {workspaceProfileTargetId === workspace.id ? 'Close' : 'Edit'}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        {settingsViewMode !== 'tabs' &&
                        workspaceProfileTargetId === workspace.id &&
                        canEditWorkspaceProfileFor(workspace) ? (
                          <div className="workspace-inline-editor">
                            <div className="workspace-inline-editor-header">
                              <strong className="truncate" title={workspace.name ?? ''}>
                                Workspace profile
                              </strong>
                            </div>
                            <div className="workspace-actions">
                              <div className="workspace-row">
                                <input
                                  value={workspaceProfileName}
                                  onChange={(event) => setWorkspaceProfileName(event.target.value)}
                                  placeholder="Workspace name"
                                />
                                <input
                                  value={workspaceProfileSlug}
                                  onChange={(event) => setWorkspaceProfileSlug(event.target.value)}
                                  placeholder="Slug (e.g. product-team)"
                                />
                              </div>
                              <div className="workspace-row">
                                <input
                                  value={workspaceProfileLanguage}
                                  onChange={(event) => setWorkspaceProfileLanguage(event.target.value)}
                                  placeholder="Language (e.g. en-US)"
                                />
                              </div>
                              <div className="workspace-row">
                                <input
                                  type="number"
                                  min={0}
                                  value={workspaceProfileMaxProjects}
                                  onChange={(event) => setWorkspaceProfileMaxProjects(event.target.value)}
                                  placeholder="Max projects (0/empty = unlimited)"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  value={workspaceProfileMaxMembers}
                                  onChange={(event) => setWorkspaceProfileMaxMembers(event.target.value)}
                                  placeholder="Max members (0/empty = unlimited)"
                                />
                              </div>
                              <div className="workspace-row">
                                <input
                                  type="number"
                                  min={0}
                                  value={workspaceProfileMaxTeams}
                                  onChange={(event) => setWorkspaceProfileMaxTeams(event.target.value)}
                                  placeholder="Max teams (0/empty = unlimited)"
                                />
                                <input
                                  type="number"
                                  min={0}
                                  value={workspaceProfileMaxStorageMb}
                                  onChange={(event) => setWorkspaceProfileMaxStorageMb(event.target.value)}
                                  placeholder="Max storage MB (0/empty = unlimited)"
                                />
                              </div>
                              <div className="workspace-profile-avatar-panel">
                                <div className="workspace-profile-avatar-preview">
                                  <span className="workspace-avatar workspace-avatar-xl workspace-avatar-edit-preview" aria-hidden="true">
                                    {workspaceProfileAvatarUrl.trim() ? (
                                      <img
                                        src={resolveAssetUrl(workspaceProfileAvatarUrl.trim())}
                                        alt=""
                                        className="framed-avatar-image"
                                        style={getAvatarFrameStyle(workspaceProfileAvatarUrl)}
                                        draggable={false}
                                        onContextMenu={(event) => event.preventDefault()}
                                      />
                                    ) : (
                                      <span>{(workspaceProfileName.trim() || workspace.name || 'W').slice(0, 1).toUpperCase()}</span>
                                    )}
                                  </span>
                                  {workspaceProfileAvatarUrl.trim() ? (
                                    <button
                                      type="button"
                                      className="avatar-thumb-delete"
                                      title="Delete photo"
                                      aria-label="Delete photo"
                                      onClick={() => {
                                        const ok = window.confirm('Delete workspace photo?')
                                        if (!ok) return
                                        void handleDeleteWorkspaceAvatar()
                                      }}
                                      disabled={workspaceProfileAvatarUploading || settingsBusy}
                                    >
                                      ×
                                    </button>
                                  ) : null}
                                </div>
                                <div className="workspace-profile-avatar-actions">
                                  <div className="workspace-profile-avatar-actions-row">
                                    <button
                                      type="button"
                                      className="btn btn-secondary team-edit-trigger"
                                      onClick={() => workspaceProfileAvatarFileRef.current?.click()}
                                      disabled={workspaceProfileAvatarUploading || settingsBusy}
                                    >
                                      {workspaceProfileAvatarUploading ? 'Uploading...' : 'Update photo'}
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-secondary team-edit-trigger"
                                      onClick={() => void handleOpenWorkspaceCropFromCurrentPhoto()}
                                      disabled={workspaceProfileAvatarUploading || settingsBusy || !workspaceProfileAvatarUrl.trim()}
                                    >
                                      Adjust crop
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-ghost team-edit-trigger"
                                      onClick={() => setWorkspacePmdImagesOpen((prev) => !prev)}
                                      disabled={workspaceProfileAvatarUploading || settingsBusy || pmdImages.length === 0}
                                    >
                                      PMD images
                                    </button>
                                  </div>
                                  <div className="workspace-profile-avatar-link-row">
                                    <input
                                      value={workspaceProfileAvatarUrl}
                                      onChange={(event) => setWorkspaceProfileAvatarUrl(event.target.value)}
                                      placeholder="Photo from link"
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-secondary team-edit-trigger"
                                      onClick={handleApplyWorkspaceAvatarFromLink}
                                      disabled={workspaceProfileAvatarUploading || settingsBusy}
                                    >
                                      Apply
                                    </button>
                                  </div>
                                  <div className="workspace-profile-avatar-meta">
                                    <span className="muted">PNG/JPG/WEBP up to 2MB</span>
                                  </div>
                                  {workspacePmdImagesOpen ? (
                                    <div className="pmd-images-grid" role="list" aria-label="PMD workspace images">
                                      {pmdImages.map((fileName) => (
                                        <button
                                          key={fileName}
                                          type="button"
                                          className="pmd-image-thumb"
                                          title={fileName}
                                          onClick={() => {
                                            setWorkspaceProfileAvatarUrl(`/profile-pictures/${fileName}`)
                                            setWorkspacePmdImagesOpen(false)
                                          }}
                                        >
                                          <img src={`/profile-pictures/${fileName}`} alt={fileName} loading="lazy" />
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                                <input
                                  ref={workspaceProfileAvatarFileRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  onChange={handleUploadWorkspaceProfileAvatar}
                                  style={{ display: 'none' }}
                                />
                              </div>
                              <textarea
                                value={workspaceProfileDescription}
                                onChange={(event) => setWorkspaceProfileDescription(event.target.value)}
                                placeholder="Workspace description"
                                rows={3}
                              />
                              <label className="checkbox-row">
                                <input
                                  type="checkbox"
                                  checked={Boolean(workspace.requireApproval)}
                                  onChange={(event) => handleToggleApproval(event.target.checked)}
                                  disabled={settingsBusy || activeWorkspace?.id !== workspace.id}
                                />
                                <span>Require approval to join</span>
                              </label>
                              {activeWorkspace?.id !== workspace.id ? (
                                <span className="muted">Switch to this workspace to change join approval policy.</span>
                              ) : null}
                              <div className="workspace-inline-actions">
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={handleSaveWorkspaceProfile}
                                  disabled={settingsBusy}
                                >
                                  Save profile
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">No workspaces yet. Create your first workspace below.</p>
                )}
              </div>
              <div className="workspace-group workspace-section-actions">
                <div className="workspace-group-header">
                  <h4>Workspace actions</h4>
                </div>
                {activeWorkspace?.demo ? (
                  <div className="workspace-inline-actions">
                    <button type="button" className="btn btn-danger team-edit-trigger" onClick={handleResetDemo}>
                      Reset Demo
                    </button>
                  </div>
                ) : null}
                <div className="workspace-actions workspace-actions-stack">
                  <div className="form-field">
                    <div data-tour="settings-create-workspace">
                    <label htmlFor="workspaceName">Create workspace</label>
                    <div className="workspace-row">
                      <input
                        id="workspaceName"
                        value={workspaceName}
                        onChange={(event) => setWorkspaceName(event.target.value)}
                        placeholder="Workspace name"
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={handleCreateWorkspace}
                        disabled={workspaceBusy}
                      >
                        Create
                      </button>
                    </div>
                    </div>
                  </div>
                  <div className="form-field">
                    <div data-tour="settings-join-workspace">
                    <label htmlFor="workspaceJoin">Join workspace</label>
                    <div className="workspace-row">
                      <input
                        id="workspaceJoin"
                        value={joinValue}
                        onChange={(event) => setJoinValue(event.target.value)}
                        placeholder="Invite token or link"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleJoinWorkspace}
                        disabled={workspaceBusy}
                      >
                        Join
                      </button>
                    </div>
                    {joinInviteResolving ? <p className="muted invite-join-meta">Checking invite...</p> : null}
                    {joinInviteWorkspaceName ? (
                      <p className="muted invite-join-meta">Workspace: {joinInviteWorkspaceName}</p>
                    ) : null}
                    {joinInviteQuestion ? (
                      <div className="form-field invite-join-question">
                        <label htmlFor="joinInviteAnswer">{joinInviteQuestion}</label>
                        <textarea
                          id="joinInviteAnswer"
                          value={joinInviteAnswer}
                          onChange={(event) => setJoinInviteAnswer(event.target.value)}
                          placeholder="Type your answer"
                          rows={2}
                          maxLength={560}
                        />
                      </div>
                    ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {settingsViewMode === 'tabs' && workspaceProfileTargetId && profileWorkspace && canEditSelectedProfile ? (
              <div className="workspace-profile-overlay" onClick={() => setWorkspaceProfileTargetId(null)}>
                <div
                  className="workspace-inline-editor workspace-inline-editor-overlay workspace-inline-editor-overlay-workspace"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="workspace-inline-editor-header">
                    <strong className="truncate" title={profileWorkspace.name ?? ''}>
                      Workspace profile
                    </strong>
                    <button type="button" className="btn btn-ghost team-edit-trigger" onClick={() => setWorkspaceProfileTargetId(null)}>
                      Close
                    </button>
                  </div>
                  <div className="workspace-actions">
                    <div className="workspace-row">
                      <input
                        value={workspaceProfileName}
                        onChange={(event) => setWorkspaceProfileName(event.target.value)}
                        placeholder="Workspace name"
                      />
                      <input
                        value={workspaceProfileSlug}
                        onChange={(event) => setWorkspaceProfileSlug(event.target.value)}
                        placeholder="Slug (e.g. product-team)"
                      />
                    </div>
                    <div className="workspace-row">
                      <input
                        value={workspaceProfileLanguage}
                        onChange={(event) => setWorkspaceProfileLanguage(event.target.value)}
                        placeholder="Language (e.g. en-US)"
                      />
                    </div>
                    <div className="workspace-row">
                      <input
                        type="number"
                        min={0}
                        value={workspaceProfileMaxProjects}
                        onChange={(event) => setWorkspaceProfileMaxProjects(event.target.value)}
                        placeholder="Max projects (0/empty = unlimited)"
                      />
                      <input
                        type="number"
                        min={0}
                        value={workspaceProfileMaxMembers}
                        onChange={(event) => setWorkspaceProfileMaxMembers(event.target.value)}
                        placeholder="Max members (0/empty = unlimited)"
                      />
                    </div>
                    <div className="workspace-row">
                      <input
                        type="number"
                        min={0}
                        value={workspaceProfileMaxTeams}
                        onChange={(event) => setWorkspaceProfileMaxTeams(event.target.value)}
                        placeholder="Max teams (0/empty = unlimited)"
                      />
                      <input
                        type="number"
                        min={0}
                        value={workspaceProfileMaxStorageMb}
                        onChange={(event) => setWorkspaceProfileMaxStorageMb(event.target.value)}
                        placeholder="Max storage MB (0/empty = unlimited)"
                      />
                    </div>
                    <div className="workspace-profile-avatar-panel">
                      <div className="workspace-profile-avatar-preview">
                        <span className="workspace-avatar workspace-avatar-xl workspace-avatar-edit-preview" aria-hidden="true">
                          {workspaceProfileAvatarUrl.trim() ? (
                            <img
                              src={resolveAssetUrl(workspaceProfileAvatarUrl.trim())}
                              alt=""
                              className="framed-avatar-image"
                              style={getAvatarFrameStyle(workspaceProfileAvatarUrl)}
                              draggable={false}
                              onContextMenu={(event) => event.preventDefault()}
                            />
                          ) : (
                            <span>{(workspaceProfileName.trim() || profileWorkspace.name || 'W').slice(0, 1).toUpperCase()}</span>
                          )}
                        </span>
                        {workspaceProfileAvatarUrl.trim() ? (
                          <button
                            type="button"
                            className="avatar-thumb-delete"
                            title="Delete photo"
                            aria-label="Delete photo"
                            onClick={() => {
                              const ok = window.confirm('Delete workspace photo?')
                              if (!ok) return
                              void handleDeleteWorkspaceAvatar()
                            }}
                            disabled={workspaceProfileAvatarUploading || settingsBusy}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                      <div className="workspace-profile-avatar-actions">
                        <div className="workspace-profile-avatar-actions-row">
                          <button
                            type="button"
                            className="btn btn-secondary team-edit-trigger"
                            onClick={() => workspaceProfileAvatarFileRef.current?.click()}
                            disabled={workspaceProfileAvatarUploading || settingsBusy}
                          >
                            {workspaceProfileAvatarUploading ? 'Uploading...' : 'Update photo'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary team-edit-trigger"
                            onClick={() => void handleOpenWorkspaceCropFromCurrentPhoto()}
                            disabled={workspaceProfileAvatarUploading || settingsBusy || !workspaceProfileAvatarUrl.trim()}
                          >
                            Adjust crop
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost team-edit-trigger"
                            onClick={() => setWorkspacePmdImagesOpen((prev) => !prev)}
                            disabled={workspaceProfileAvatarUploading || settingsBusy || pmdImages.length === 0}
                          >
                            PMD images
                          </button>
                        </div>
                        <div className="workspace-profile-avatar-link-row">
                          <input
                            value={workspaceProfileAvatarUrl}
                            onChange={(event) => setWorkspaceProfileAvatarUrl(event.target.value)}
                            placeholder="Photo from link"
                          />
                          <button
                            type="button"
                            className="btn btn-secondary team-edit-trigger"
                            onClick={handleApplyWorkspaceAvatarFromLink}
                            disabled={workspaceProfileAvatarUploading || settingsBusy}
                          >
                            Apply
                          </button>
                        </div>
                        <div className="workspace-profile-avatar-meta">
                          <span className="muted">PNG/JPG/WEBP up to 2MB</span>
                        </div>
                        {workspacePmdImagesOpen ? (
                          <div className="pmd-images-grid" role="list" aria-label="PMD workspace images">
                            {pmdImages.map((fileName) => (
                              <button
                                key={fileName}
                                type="button"
                                className="pmd-image-thumb"
                                title={fileName}
                                onClick={() => {
                                  setWorkspaceProfileAvatarUrl(`/profile-pictures/${fileName}`)
                                  setWorkspacePmdImagesOpen(false)
                                }}
                              >
                                <img src={`/profile-pictures/${fileName}`} alt={fileName} loading="lazy" />
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <input
                        ref={workspaceProfileAvatarFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleUploadWorkspaceProfileAvatar}
                        style={{ display: 'none' }}
                      />
                    </div>
                    <textarea
                      value={workspaceProfileDescription}
                      onChange={(event) => setWorkspaceProfileDescription(event.target.value)}
                      placeholder="Workspace description"
                      rows={3}
                    />
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={Boolean(profileWorkspace.requireApproval)}
                        onChange={(event) => handleToggleApproval(event.target.checked)}
                        disabled={settingsBusy || activeWorkspace?.id !== profileWorkspace.id}
                      />
                      <span>Require approval to join</span>
                    </label>
                    {activeWorkspace?.id !== profileWorkspace.id ? (
                      <span className="muted">Switch to this workspace to change join approval policy.</span>
                    ) : null}
                    <div className="workspace-inline-actions">
                      <button type="button" className="btn btn-primary" onClick={handleSaveWorkspaceProfile} disabled={settingsBusy}>
                        Save profile
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="workspace-divider" />
            {activeWorkspace?.id && (canInviteMembers || canApproveRequests) ? (
                <div className="workspace-management">
                  {canInviteMembers ? (
                    <div className="workspace-subpanel workspace-subpanel-invites">
                      <div className="panel-header">
                        <div>
                          <h4>Invites</h4>
                        </div>
                      </div>
                      <div className="invite-controls">
                        <div className="form-field">
                          <label htmlFor="inviteDays">Expires in (days)</label>
                          <input
                            id="inviteDays"
                            type="number"
                            min={1}
                            value={inviteDays}
                            onChange={(event) => setInviteDays(event.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="inviteMaxUses">Max uses</label>
                          <input
                            id="inviteMaxUses"
                            type="number"
                            min={1}
                            value={inviteMaxUses}
                            onChange={(event) => setInviteMaxUses(event.target.value)}
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="inviteDefaultRoleId">Default role on join</label>
                          <select
                            id="inviteDefaultRoleId"
                            value={inviteDefaultRoleId}
                            onChange={(event) => setInviteDefaultRoleId(event.target.value)}
                          >
                            {roles.map((role) => (
                              <option key={role.id ?? role.name} value={role.id ?? ''}>
                                {role.name ?? 'Role'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-field">
                          <label htmlFor="inviteEmail">Invite email (optional direct invite)</label>
                          <input
                            id="inviteEmail"
                            type="email"
                            value={inviteEmail}
                            onChange={(event) => setInviteEmail(event.target.value)}
                            placeholder="user@example.com"
                          />
                        </div>
                        <div className="form-field">
                          <label htmlFor="inviteQuestion">Join question (optional)</label>
                          <textarea
                            id="inviteQuestion"
                            value={inviteQuestion}
                            onChange={(event) => setInviteQuestion(event.target.value)}
                            placeholder="Optional question for users joining with this invite"
                            rows={2}
                            maxLength={280}
                          />
                        </div>
                        <button type="button" className="btn btn-secondary" onClick={handleCreateInvite}>
                          Create invite
                        </button>
                      </div>
                      {invitesLoading ? <p className="muted">Loading invites...</p> : null}
                      {!invitesLoading && invites.length === 0 ? <p className="muted">No invites yet.</p> : null}
                      {invites.length > 0 ? (
                        <div className="workspace-list compact invite-list">
                          {invites.map((invite) => {
                            const link = buildInviteLink(invite.token)
                            const remaining =
                              typeof invite.maxUses === 'number'
                                ? Math.max(invite.maxUses - (invite.usesCount ?? 0), 0)
                                : null
                            const expired =
                              invite.expiresAt ? new Date(invite.expiresAt).getTime() < Date.now() : false
                            return (
                              <div key={invite.id ?? invite.token} className="workspace-item compact invite-item">
                                <div className="invite-meta">
                                  <div className="invite-title">
                                    <strong className="truncate" title={invite.code ?? invite.token ?? ''}>
                                      {invite.code ?? 'Invite'}
                                    </strong>
                                    <div className="workspace-badges">
                                      {invite.revoked ? <span className="pill">Revoked</span> : null}
                                      {expired ? <span className="pill">Expired</span> : null}
                                    </div>
                                  </div>
                                  <div className="muted invite-details">
                                    {invite.expiresAt
                                      ? `Expires ${new Date(invite.expiresAt).toLocaleDateString()}`
                                      : 'No expiry'}
                                    {typeof remaining === 'number'
                                      ? ` - ${remaining} uses left`
                                      : ' - Unlimited uses'}
                                    {invite.defaultRoleId ? ` - role: ${roleNameById.get(invite.defaultRoleId) ?? 'Member'}` : ''}
                                    {invite.invitedEmail ? ` - direct: ${invite.invitedEmail}` : ''}
                                    {invite.joinQuestion ? ' - join question enabled' : ''}
                                  </div>
                                </div>
                                <div className="invite-actions invite-menu-wrap">
                                  <button
                                    type="button"
                                    className="btn btn-secondary invite-menu-trigger"
                                    title="Invite actions"
                                    aria-label="Invite actions"
                                    onClick={() =>
                                      setOpenInviteMenuId((prev) => (prev === (invite.id ?? invite.token ?? '') ? null : (invite.id ?? invite.token ?? '')))
                                    }
                                  >
                                    ▼
                                  </button>
                                  {openInviteMenuId === (invite.id ?? invite.token ?? '') ? (
                                    <div className="invite-menu-dropdown">
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => {
                                          void handleCopy(link, 'Invite link')
                                          setOpenInviteMenuId(null)
                                        }}
                                      >
                                        Copy link
                                      </button>
                                      {invite.code ? (
                                        <button
                                          type="button"
                                          className="btn btn-secondary"
                                          onClick={() => {
                                            void handleCopy(invite.code ?? '', 'Invite code')
                                            setOpenInviteMenuId(null)
                                          }}
                                        >
                                          Copy code
                                        </button>
                                      ) : null}
                                      {!invite.revoked ? (
                                        <button
                                          type="button"
                                          className="btn btn-danger"
                                          onClick={() => {
                                            void handleRevokeInvite(invite.id)
                                            setOpenInviteMenuId(null)
                                          }}
                                        >
                                          Revoke
                                        </button>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {canApproveRequests ? (
                    <div className="workspace-subpanel workspace-subpanel-requests">
                      <div className="panel-header">
                        <div>
                          <h4>Pending requests</h4>
                        </div>
                      </div>
                      {requestsLoading ? <p className="muted">Loading requests...</p> : null}
                      {!requestsLoading && requests.length === 0 ? <p className="muted">No pending requests.</p> : null}
                      {requests.length > 0 ? (
                        <div className="workspace-list compact request-list">
                          {requests.map((request) => (
                            <div key={request.id ?? request.userId} className="workspace-item compact request-item">
                              <div className="invite-meta">
                                <strong className="truncate" title={request.userName ?? request.userEmail ?? ''}>
                                  {request.userName ?? request.userEmail ?? 'User'}
                                </strong>
                                <span className="muted">{request.userEmail ?? ''}</span>
                                {request.inviteQuestion ? (
                                  <div className="request-answer-block">
                                    <span className="muted truncate" title={request.inviteQuestion ?? ''}>
                                      Q: {request.inviteQuestion}
                                    </span>
                                    <span className="truncate" title={request.inviteAnswer ?? ''}>
                                      A: {request.inviteAnswer?.trim() ? request.inviteAnswer : 'No answer provided'}
                                    </span>
                                  </div>
                                ) : null}
                              </div>
                              <div className="invite-actions">
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => handleApproveRequest(request.id)}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-danger"
                                  onClick={() => handleDenyRequest(request.id)}
                                >
                                  Deny
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {settingsViewMode === 'tabs' ? (
                    <div className="workspace-subpanel workspace-subpanel-coming">
                      <button
                        type="button"
                        className="coming-soon-toggle"
                        onClick={() => toggleComingSoon('workspacesTabs')}
                        aria-expanded={comingSoonExpanded.workspacesTabs}
                      >
                        <span>Coming soon</span>
                        <span className={`coming-soon-chevron${comingSoonExpanded.workspacesTabs ? ' is-open' : ''}`} aria-hidden="true">
                          ▾
                        </span>
                      </button>
                      {comingSoonExpanded.workspacesTabs ? (
                        <div className="workspace-actions workspace-actions-stack">
                          <button type="button" className="btn btn-danger coming-soon-button" disabled>
                            Member lifecycle (suspend/remove/re-activate) - Coming soon
                          </button>
                          <button type="button" className="btn btn-danger coming-soon-button" disabled>
                            Default role on join invite - Coming soon
                          </button>
                          <button type="button" className="btn btn-danger coming-soon-button" disabled>
                            Workspace limits (projects/members/storage) - Coming soon
                          </button>
                          <button type="button" className="btn btn-danger coming-soon-button" disabled>
                            Export/backup data (admin only) - Coming soon
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            {settingsViewMode !== 'tabs' ? (
              <>
                <div className="workspace-divider" />
                <div className="workspace-group roles-actions-group">
                  <button
                    type="button"
                    className="coming-soon-toggle"
                    onClick={() => toggleComingSoon('workspacesGrid')}
                    aria-expanded={comingSoonExpanded.workspacesGrid}
                  >
                    <span>Coming soon</span>
                    <span className={`coming-soon-chevron${comingSoonExpanded.workspacesGrid ? ' is-open' : ''}`} aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {comingSoonExpanded.workspacesGrid ? (
                    <div className="workspace-actions">
                      <button type="button" className="btn btn-danger coming-soon-button" disabled>
                        Member lifecycle (suspend/remove/re-activate) - Coming soon
                      </button>
                      <button type="button" className="btn btn-danger coming-soon-button" disabled>
                        Default role on join invite - Coming soon
                      </button>
                      <button type="button" className="btn btn-danger coming-soon-button" disabled>
                        Workspace limits (projects/members/storage) - Coming soon
                      </button>
                      <button type="button" className="btn btn-danger coming-soon-button" disabled>
                        Export/backup data (admin only) - Coming soon
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('workspaces', 'bottom')} />
          ) : null}
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'audit' ? ' is-drop-target' : ''}${isTabVisible('audit') ? '' : ' settings-card-hidden'}`}
          data-panel-id="audit"
          ref={setPanelRef('audit')}
          style={panelCardStyle('audit')}
          onDragOver={handlePanelDragOver('audit')}
          onDrop={handlePanelDrop('audit')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'audit' ? null : prev))}
        >
          {/* Audit card stays pinned at top in grid mode; only bottom resize is allowed. */}
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Audit</h3>
            </div>
            {settingsViewMode === 'grid' ? renderOrderControl('audit', 'Audit') : null}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              {!canViewAudit ? <p className="muted">You do not have permission to view audit events.</p> : null}
              {canViewAudit ? (
                <>
                  <div className="workspace-inline-actions audit-actions-compact">
                    <button
                      type="button"
                      className={`btn btn-secondary team-edit-trigger${auditFiltersOpen ? ' assign-toggle is-active' : ''}`}
                      onClick={() => setAuditFiltersOpen((prev) => !prev)}
                    >
                      Filter / Search
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary team-edit-trigger"
                      onClick={() => {
                        if (activeWorkspaceId) void loadAudit(activeWorkspaceId)
                      }}
                      disabled={auditLoading || !activeWorkspaceId}
                    >
                      {auditLoading ? '...' : '↻'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary team-edit-trigger"
                      onClick={() => {
                        setAuditQuery('')
                        setAuditCategory('')
                        setAuditAction('')
                        setAuditActorUserId('')
                        setAuditTargetUserId('')
                        setAuditTeamId('')
                        setAuditRoleId('')
                        setAuditProjectId('')
                        setAuditPersonalOnly(false)
                      }}
                    >
                      Reset
                    </button>
                  </div>
                  {auditFiltersOpen ? (
                    <div className="audit-toolbar">
                      <input
                        className="audit-toolbar-search"
                        value={auditQuery}
                        onChange={(event) => setAuditQuery(event.target.value)}
                        placeholder="Search"
                      />
                      <select value={auditCategory} onChange={(event) => setAuditCategory(event.target.value)} title="Category">
                        <option value="">Category</option>
                        {AUDIT_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                      <input value={auditAction} onChange={(event) => setAuditAction(event.target.value)} placeholder="Act" title="Action" />
                      <select value={auditActorUserId} onChange={(event) => setAuditActorUserId(event.target.value)} title="Actor">
                        <option value="">Actor</option>
                        {members.map((member) => (
                          <option key={`audit-actor-${member.id ?? member.email}`} value={member.id ?? ''}>
                            {member.displayName ?? member.email ?? 'User'}
                          </option>
                        ))}
                      </select>
                      <select value={auditTargetUserId} onChange={(event) => setAuditTargetUserId(event.target.value)} title="Target">
                        <option value="">Target</option>
                        {members.map((member) => (
                          <option key={`audit-target-${member.id ?? member.email}`} value={member.id ?? ''}>
                            {member.displayName ?? member.email ?? 'User'}
                          </option>
                        ))}
                      </select>
                      <select value={auditTeamId} onChange={(event) => setAuditTeamId(event.target.value)} title="Team">
                        <option value="">Team</option>
                        {teams.map((team) => (
                          <option key={`audit-team-${team.id ?? team.name}`} value={team.id ?? ''}>
                            {team.name ?? 'Team'}
                          </option>
                        ))}
                      </select>
                      <select value={auditRoleId} onChange={(event) => setAuditRoleId(event.target.value)} title="Role">
                        <option value="">Role</option>
                        {roles.map((role) => (
                          <option key={`audit-role-${role.id ?? role.name}`} value={role.id ?? ''}>
                            {role.name ?? 'Role'}
                          </option>
                        ))}
                      </select>
                      <input value={auditProjectId} onChange={(event) => setAuditProjectId(event.target.value)} placeholder="Project" title="Project" />
                      <label className="checkbox-row audit-personal-only">
                        <input
                          type="checkbox"
                          checked={auditPersonalOnly}
                          onChange={(event) => setAuditPersonalOnly(event.target.checked)}
                        />
                        <span>Mine</span>
                      </label>
                    </div>
                  ) : null}
                  {auditEvents.length === 0 && !auditLoading ? <p className="muted">No audit events for current filters.</p> : null}
                  {auditEvents.length > 0 ? (
                    <div className="audit-table-wrap settings-scroll">
                      <table className="audit-table">
                        <thead>
                          <tr>
                            <th>Time</th>
                            <th>Cat</th>
                            <th>Act</th>
                            <th>Actor</th>
                            <th>Target</th>
                            <th>Team</th>
                            <th>Role</th>
                            <th>Project</th>
                            <th>Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditEvents.map((event) => (
                            <tr key={event.id ?? `${event.createdAt}-${event.action}`}>
                              <td>{event.createdAt ? new Date(event.createdAt).toLocaleString() : ''}</td>
                              <td>{event.category ?? '-'}</td>
                              <td>{event.action ?? '-'}</td>
                              <td title={event.actorUserId ?? ''}>{event.actorName ?? '-'}</td>
                              <td>{event.targetUserId ?? '-'}</td>
                              <td>{event.teamId ?? '-'}</td>
                              <td>{event.roleId ?? '-'}</td>
                              <td>{event.projectId ?? '-'}</td>
                              <td title={event.message ?? ''}>{event.message ?? '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('audit', 'bottom')} />
          ) : null}
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'teams' ? ' is-drop-target' : ''}${isTabVisible('teams') ? '' : ' settings-card-hidden'}`}
          data-panel-id="teams"
          ref={setPanelRef('teams')}
          style={panelCardStyle('teams')}
          onDragOver={handlePanelDragOver('teams')}
          onDrop={handlePanelDrop('teams')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'teams' ? null : prev))}
        >
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle top" onMouseDown={handleResizeStart('teams', 'top')} />
          ) : null}
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Teams</h3>
            </div>
            {settingsViewMode === 'grid' ? renderOrderControl('teams', 'Teams') : null}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              {teams.length === 0 ? <p className="muted">No teams yet.</p> : null}
              {teams.length > 0 ? (
                <div className="workspace-list compact settings-scroll">
                  {teams.map((team) => (
                    <div key={team.id ?? team.name} className="workspace-item compact settings-edit-item">
                      <div className="workspace-row team-list-row">
                        <div className="workspace-name truncate" title={team.name ?? ''}>
                          <span
                            className="team-color-dot"
                            style={{ borderBottomColor: team.color ?? '#3B82F6' }}
                            aria-hidden="true"
                          />
                          {team.name ?? 'Untitled'}
                        </div>
                        <div className="workspace-inline-actions">
                          <span className="pill team-member-count">{teamMemberCountById.get(team.id ?? '') ?? 0}</span>
                          {team.isActive === false ? <span className="pill">Inactive</span> : null}
                          {canEditTeams && editingTeamId !== team.id ? (
                            <button
                              type="button"
                              className="btn btn-secondary team-edit-trigger"
                              onClick={() => handleStartEditTeam(team.id, team.name, team.color)}
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {settingsViewMode !== 'tabs' && editingTeamId === team.id && canEditTeams ? (
                        <div className="team-edit-box">
                          <div className="workspace-inline-actions">
                            <button
                              type="button"
                              className={`btn btn-ghost${editingTeamAction === 'rename' ? ' assign-toggle is-active' : ''}`}
                              onClick={() => setEditingTeamAction('rename')}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost${editingTeamAction === 'toggle' ? ' assign-toggle is-active' : ''}`}
                              onClick={() => setEditingTeamAction('toggle')}
                            >
                              {team.isActive === false ? 'Activate' : 'Deactivate'}
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost${editingTeamAction === 'delete' ? ' assign-toggle is-active' : ''}`}
                              onClick={() => setEditingTeamAction('delete')}
                            >
                              Delete
                            </button>
                          </div>
                          {editingTeamAction === 'rename' ? (
                            <div className="team-edit-rename">
                              <input
                                value={editingTeamName}
                                onChange={(event) => {
                                  setEditingTeamName(event.target.value)
                                  if (teamError) setTeamError(null)
                                }}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault()
                                    void handleConfirmTeamAction(team.id, team.isActive)
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault()
                                    handleCancelEditTeam()
                                  }
                                }}
                                placeholder="New team name"
                              />
                              <div className="team-color-picker team-color-picker-edit" role="group" aria-label="Edit team color">
                                {TEAM_COLOR_PALETTE.map((color) => {
                                  const selected = editingTeamColor === color
                                  return (
                                    <button
                                      key={`edit-team-color-${team.id ?? team.name}-${color}`}
                                      type="button"
                                      className={`team-color-swatch${selected ? ' is-selected' : ''}`}
                                      style={{ backgroundColor: color }}
                                      onClick={() => {
                                        setEditingTeamColor(color)
                                        if (teamError) setTeamError(null)
                                      }}
                                      title={color}
                                      aria-label={`Select color ${color}`}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          ) : (
                            <p className="muted team-edit-note">
                              {editingTeamAction === 'delete'
                                ? 'Delete will deactivate this team.'
                                : editingTeamAction === 'toggle'
                                  ? `This will ${team.isActive === false ? 'activate' : 'deactivate'} this team.`
                                  : 'Choose an action.'}
                            </p>
                          )}
                          <div className="workspace-inline-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => void handleConfirmTeamAction(team.id, team.isActive)}
                              disabled={!editingTeamAction}
                            >
                              Confirm
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={handleCancelEditTeam}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Team actions</h4>
              </div>
              <div className="workspace-actions">
                <div className="form-field">
                  <label htmlFor="teamName">Create team</label>
                  <div className="workspace-row">
                    <input
                      id="teamName"
                      value={teamName}
                      onChange={(event) => {
                        setTeamName(event.target.value)
                        if (teamError) setTeamError(null)
                      }}
                      placeholder="New team name"
                      disabled={!canCreateTeams}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCreateTeam}
                      disabled={!canCreateTeams}
                      title={!canCreateTeams ? 'Only workspace owner/manager can create teams.' : undefined}
                    >
                      Add team
                    </button>
                  </div>
                  <div className="team-color-picker" role="group" aria-label="Team color">
                    {TEAM_COLOR_PALETTE.map((color) => {
                      const selected = teamColor === color
                      return (
                        <button
                          key={`team-color-${color}`}
                          type="button"
                          className={`team-color-swatch${selected ? ' is-selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setTeamColor(color)}
                          title={color}
                          aria-label={`Select color ${color}`}
                        />
                      )
                    })}
                  </div>
                  {teamError ? <p className="field-error">{teamError}</p> : null}
                  {!activeWorkspaceId ? <p className="muted">Select a workspace to manage teams.</p> : null}
                  {activeWorkspaceId && !canManageTeams ? (
                    <p className="muted">You do not have permission to manage teams.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          {settingsViewMode === 'tabs' && editingTeam && canEditTeams ? (
            <div className="workspace-profile-overlay" onClick={handleCancelEditTeam}>
              <div
                className="workspace-inline-editor workspace-inline-editor-overlay workspace-inline-editor-overlay-team"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="workspace-inline-editor-header">
                  <strong className="truncate" title={editingTeam.name ?? ''}>
                    Team edit: {editingTeam.name ?? 'Team'}
                  </strong>
                  <button type="button" className="btn btn-ghost team-edit-trigger" onClick={handleCancelEditTeam}>
                    Close
                  </button>
                </div>
                <div className="team-edit-box">
                  <div className="workspace-inline-actions">
                    <button
                      type="button"
                      className={`btn btn-ghost${editingTeamAction === 'rename' ? ' assign-toggle is-active' : ''}`}
                      onClick={() => setEditingTeamAction('rename')}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost${editingTeamAction === 'toggle' ? ' assign-toggle is-active' : ''}`}
                      onClick={() => setEditingTeamAction('toggle')}
                    >
                      {editingTeam.isActive === false ? 'Activate' : 'Deactivate'}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost${editingTeamAction === 'delete' ? ' assign-toggle is-active' : ''}`}
                      onClick={() => setEditingTeamAction('delete')}
                    >
                      Delete
                    </button>
                  </div>
                  {editingTeamAction === 'rename' ? (
                    <div className="team-edit-rename">
                      <input
                        value={editingTeamName}
                        onChange={(event) => {
                          setEditingTeamName(event.target.value)
                          if (teamError) setTeamError(null)
                        }}
                        placeholder="New team name"
                      />
                      <div className="team-color-picker team-color-picker-edit" role="group" aria-label="Edit team color">
                        {TEAM_COLOR_PALETTE.map((color) => {
                          const selected = editingTeamColor === color
                          return (
                            <button
                              key={`edit-team-overlay-color-${editingTeam.id ?? editingTeam.name}-${color}`}
                              type="button"
                              className={`team-color-swatch${selected ? ' is-selected' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => {
                                setEditingTeamColor(color)
                                if (teamError) setTeamError(null)
                              }}
                              title={color}
                              aria-label={`Select color ${color}`}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="muted team-edit-note">
                      {editingTeamAction === 'delete'
                        ? 'Delete will deactivate this team.'
                        : editingTeamAction === 'toggle'
                          ? `This will ${editingTeam.isActive === false ? 'activate' : 'deactivate'} this team.`
                          : 'Choose an action.'}
                    </p>
                  )}
                  {teamError ? <p className="field-error">{teamError}</p> : null}
                  <div className="workspace-inline-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleConfirmTeamAction(editingTeam.id, editingTeam.isActive)}
                      disabled={!editingTeamAction}
                    >
                      Confirm
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleCancelEditTeam}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('teams', 'bottom')} />
          ) : null}
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'notifications' ? ' is-drop-target' : ''}${isTabVisible('notifications') ? '' : ' settings-card-hidden'}`}
          data-panel-id="notifications"
          ref={setPanelRef('notifications')}
          style={panelCardStyle('notifications')}
          onDragOver={handlePanelDragOver('notifications')}
          onDrop={handlePanelDrop('notifications')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'notifications' ? null : prev))}
        >
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle top" onMouseDown={handleResizeStart('notifications', 'top')} />
          ) : null}
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Notifications</h3>
            </div>
            {settingsViewMode === 'grid' ? renderOrderControl('notifications', 'Notifications') : null}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Mail</h4>
              </div>
              {notificationPreferences ? (
                <div className="settings-tab-two-col">
                  <div className="settings-tab-main workspace-actions">
                    {sortedNotificationRows.map((row) => (
                      <label key={`notification-row-${row.key}`} className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          onChange={(event) => handleNotificationToggle(row.key, event.target.checked)}
                          disabled={notificationBusy}
                        />
                        <span>{row.label}</span>
                      </label>
                    ))}
                    <div className="workspace-divider" />
                    <div className="form-field">
                      <label>Browser notifications</label>
                      <div className="workspace-row">
                        <input
                          value={
                            browserPermission === 'unsupported'
                              ? 'Unsupported'
                              : browserPermission === 'granted'
                                ? 'Enabled'
                                : browserPermission === 'denied'
                                  ? 'Blocked'
                                  : 'Not enabled'
                          }
                          readOnly
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={handleEnableBrowserNotifications}
                          disabled={browserPermission === 'unsupported' || browserPermission === 'granted'}
                        >
                          Enable
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="settings-tab-side">
                    <button
                      type="button"
                      className="coming-soon-toggle"
                      onClick={() => toggleComingSoon('notifications')}
                      aria-expanded={comingSoonExpanded.notifications}
                    >
                      <span>Coming soon</span>
                      <span className={`coming-soon-chevron${comingSoonExpanded.notifications ? ' is-open' : ''}`} aria-hidden="true">
                        ▾
                      </span>
                    </button>
                    {comingSoonExpanded.notifications ? (
                      <>
                        <div className="form-field coming-soon-control" title="Coming soon">
                          <label className="checkbox-row">
                            <input type="checkbox" disabled />
                            <span>Digest mode (hourly/daily)</span>
                          </label>
                          <span className="pill coming-soon-pill">Soon</span>
                        </div>
                        <div className="form-field coming-soon-control" title="Coming soon">
                          <label className="checkbox-row">
                            <input type="checkbox" disabled />
                            <span>In-app notification center</span>
                          </label>
                          <span className="pill coming-soon-pill">Soon</span>
                        </div>
                        <div className="form-field coming-soon-control" title="Coming soon">
                          <label className="checkbox-row">
                            <input type="checkbox" disabled />
                            <span>Per-workspace notification profile</span>
                          </label>
                          <span className="pill coming-soon-pill">Soon</span>
                        </div>
                        <div className="form-field coming-soon-control" title="Coming soon">
                          <label className="checkbox-row">
                            <input type="checkbox" disabled />
                            <span>Quiet hours</span>
                          </label>
                          <span className="pill coming-soon-pill">Soon</span>
                        </div>
                        <div className="form-field coming-soon-control" title="Coming soon">
                          <label className="checkbox-row">
                            <input type="checkbox" disabled />
                            <span>Snooze notifications</span>
                          </label>
                          <span className="pill coming-soon-pill">Soon</span>
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="muted">Loading preferences...</p>
              )}
            </div>
          </div>
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('notifications', 'bottom')} />
          ) : null}
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'roles' ? ' is-drop-target' : ''}${isTabVisible('roles') ? '' : ' settings-card-hidden'}`}
          data-panel-id="roles"
          ref={setPanelRef('roles')}
          style={panelCardStyle('roles')}
          onDragOver={handlePanelDragOver('roles')}
          onDrop={handlePanelDrop('roles')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'roles' ? null : prev))}
        >
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle top" onMouseDown={handleResizeStart('roles', 'top')} />
          ) : null}
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Roles</h3>
            </div>
            {settingsViewMode === 'grid' ? renderOrderControl('roles', 'Roles') : null}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              {rolesLoading ? <p className="muted">Loading roles...</p> : null}
              {rolesError ? <p className="field-error">{rolesError}</p> : null}
              {!rolesLoading && roles.length === 0 ? <p className="muted">No roles yet.</p> : null}
              {roles.length > 0 ? (
                <div className="workspace-list compact settings-scroll">
                  {roles.map((role) => (
                    <div key={role.id ?? role.name} className="workspace-item compact settings-edit-item">
                      <div className="workspace-row role-list-row">
                        <div className="workspace-name truncate" title={role.name ?? ''}>
                          {role.name ?? 'Untitled'}
                        </div>
                        <div className="workspace-inline-actions">
                          <span className="pill team-member-count">
                            {roleMemberCountByName.get((role.name ?? '').trim().toLocaleLowerCase()) ?? 0}
                          </span>
                          {role.system ? (
                            <span className="pill">{activeWorkspace?.demo ? 'Demo' : 'System'}</span>
                          ) : null}
                          {canEditRoles ? (
                            <button
                              type="button"
                              className="btn btn-secondary team-edit-trigger"
                              onClick={() => handleStartEditRole(role)}
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {settingsViewMode !== 'tabs' && editingRoleId === role.id && canEditRoles ? (
                        <div className="team-edit-box">
                          <div className="workspace-inline-actions">
                            <button
                              type="button"
                              className={`btn btn-ghost${editingRoleAction === 'rename' ? ' assign-toggle is-active' : ''}`}
                              onClick={() => setEditingRoleAction('rename')}
                              disabled={Boolean(role.system)}
                              title={role.system ? 'Demo/System role name is fixed.' : undefined}
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              className={`btn btn-ghost${editingRoleAction === 'permissions' ? ' assign-toggle is-active' : ''}`}
                              onClick={() => setEditingRoleAction('permissions')}
                            >
                              Permissions
                            </button>
                            {role.system ? (
                              <button
                                type="button"
                                className={`btn btn-ghost${editingRoleAction === 'reset' ? ' assign-toggle is-active' : ''}`}
                                onClick={() => setEditingRoleAction('reset')}
                              >
                                Reset default
                              </button>
                            ) : null}
                          </div>
                          {editingRoleAction === 'rename' ? (
                            <input
                              value={editingRoleName}
                              onChange={(event) => setEditingRoleName(event.target.value)}
                              placeholder="Role name"
                              disabled={Boolean(role.system)}
                            />
                          ) : null}
                          {editingRoleAction === 'permissions' ? (
                            <div className="settings-permissions">
                              {ROLE_PERMISSION_GROUPS.map((group) => (
                                <div key={`inline-edit-${group.label}`} className="settings-permission-group">
                                  <div className="settings-permission-title">{group.label}</div>
                                  {group.items.map((item) => (
                                    <label key={item.key} className="checkbox-row">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(editingRolePermissions?.[item.key])}
                                        onChange={() =>
                                          setEditingRolePermissions((prev) => toggleRolePermission(prev, item.key))
                                        }
                                      />
                                      <span>{item.label}</span>
                                    </label>
                                  ))}
                                </div>
                              ))}
                            </div>
                          ) : null}
                          {editingRoleAction === 'reset' ? (
                            <p className="muted team-edit-note">
                              This will restore the default permission set for this {activeWorkspace?.demo ? 'demo' : 'system'} role.
                            </p>
                          ) : null}
                          <div className="workspace-inline-actions">
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => void handleConfirmRoleAction()}
                              disabled={!editingRoleAction}
                            >
                              Confirm
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={handleCancelEditRole}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Role actions</h4>
                <span className={`muted${customRolesLimitReached ? ' field-error' : ''}`}>
                  Custom roles: {customRolesCount}/{MAX_CUSTOM_ROLES_PER_WORKSPACE}
                </span>
              </div>
              <div className="workspace-actions">
                <div className="form-field role-create-field">
                  <label htmlFor="roleName">Create role</label>
                  <div className="workspace-row">
                    <input
                      id="roleName"
                      value={roleName}
                      onChange={(event) => setRoleName(event.target.value)}
                      placeholder="Role name"
                      disabled={!canEditRoles || customRolesLimitReached}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCreateRole}
                      disabled={!canEditRoles || customRolesLimitReached}
                    >
                      Add role
                    </button>
                  </div>
                </div>
                <div className="form-field role-assign-field">
                  <label>Assign role</label>
                  <div className="workspace-row workspace-row-assign-role">
                    <select
                      value={assignUserId}
                      onChange={(event) => setAssignUserId(event.target.value)}
                      disabled={!canEditRoles || membersLoading}
                    >
                      <option value="">Select member</option>
                      {members.map((member) => (
                        <option key={member.id ?? member.email} value={member.id ?? ''}>
                          {member.displayName ?? member.email ?? 'Member'}
                        </option>
                      ))}
                    </select>
                    <select
                      value={assignRoleId}
                      onChange={(event) => setAssignRoleId(event.target.value)}
                      disabled={!canEditRoles || rolesLoading}
                    >
                      <option value="">Select role</option>
                      {roles.map((role) => (
                        <option key={role.id ?? role.name} value={role.id ?? ''}>
                          {role.name ?? 'Role'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAssignRole}
                      disabled={!canEditRoles || !assignUserId || !assignRoleId}
                    >
                      Assign
                    </button>
                  </div>
                  {membersLoading ? <p className="muted">Loading members...</p> : null}
                </div>
                {canEditRoles ? (
                  <div className="form-field role-permissions-field">
                    <label>Role permissions</label>
                    <div className="settings-permissions">
                      {ROLE_PERMISSION_GROUPS.map((group) => (
                        <div key={group.label} className="settings-permission-group">
                          <div className="settings-permission-title">{group.label}</div>
                          {group.items.map((item) => (
                            <label key={item.key} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={Boolean(rolePermissions?.[item.key])}
                                onChange={() => setRolePermissions((prev) => toggleRolePermission(prev, item.key))}
                              />
                              <span>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="muted">You do not have permission to manage roles.</p>
                )}
              </div>
            </div>
          </div>
          {settingsViewMode === 'tabs' && editingRole && canEditRoles ? (
            <div className="workspace-profile-overlay" onClick={handleCancelEditRole}>
              <div
                className="workspace-inline-editor workspace-inline-editor-overlay workspace-inline-editor-overlay-role"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="workspace-inline-editor-header">
                  <strong className="truncate" title={editingRole.name ?? ''}>
                    Role edit: {editingRole.name ?? 'Role'}
                  </strong>
                  <button type="button" className="btn btn-ghost team-edit-trigger" onClick={handleCancelEditRole}>
                    Close
                  </button>
                </div>
                <div className="team-edit-box">
                  <div className="workspace-inline-actions">
                    <button
                      type="button"
                      className={`btn btn-ghost${editingRoleAction === 'rename' ? ' assign-toggle is-active' : ''}`}
                      onClick={() => setEditingRoleAction('rename')}
                      disabled={Boolean(editingRole.system)}
                      title={editingRole.system ? 'Demo/System role name is fixed.' : undefined}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className={`btn btn-ghost${editingRoleAction === 'permissions' ? ' assign-toggle is-active' : ''}`}
                      onClick={() => setEditingRoleAction('permissions')}
                    >
                      Permissions
                    </button>
                    {editingRole.system ? (
                      <button
                        type="button"
                        className={`btn btn-ghost${editingRoleAction === 'reset' ? ' assign-toggle is-active' : ''}`}
                        onClick={() => setEditingRoleAction('reset')}
                      >
                        Reset default
                      </button>
                    ) : null}
                  </div>
                  {editingRoleAction === 'rename' ? (
                    <input
                      value={editingRoleName}
                      onChange={(event) => setEditingRoleName(event.target.value)}
                      placeholder="Role name"
                      disabled={Boolean(editingRole.system)}
                    />
                  ) : null}
                  {editingRoleAction === 'permissions' ? (
                    <div className="settings-permissions">
                      {ROLE_PERMISSION_GROUPS.map((group) => (
                        <div key={`overlay-edit-${group.label}`} className="settings-permission-group">
                          <div className="settings-permission-title">{group.label}</div>
                          {group.items.map((item) => (
                            <label key={item.key} className="checkbox-row">
                              <input
                                type="checkbox"
                                checked={Boolean(editingRolePermissions?.[item.key])}
                                onChange={() => setEditingRolePermissions((prev) => toggleRolePermission(prev, item.key))}
                              />
                              <span>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {editingRoleAction === 'reset' ? (
                    <p className="muted team-edit-note">
                      This will restore the default permission set for this {activeWorkspace?.demo ? 'demo' : 'system'} role.
                    </p>
                  ) : null}
                  <div className="workspace-inline-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleConfirmRoleAction()}
                      disabled={!editingRoleAction}
                    >
                      Confirm
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleCancelEditRole}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {settingsViewMode === 'grid' ? (
            <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('roles', 'bottom')} />
          ) : null}
        </div>
        {draggingPanel && settingsViewMode === 'grid' ? (
          <div
            className={`settings-empty-slot${dragOverPanel === 'end' ? ' is-drop-target' : ''}`}
            style={{ order: panelOrder.length + 1 }}
            onDragOver={handlePanelDragOver('end')}
            onDrop={handlePanelDrop('end')}
            onDragLeave={() => setDragOverPanel((prev) => (prev === 'end' ? null : prev))}
          >
            Drop Here
          </div>
        ) : null}
      </div>
      {workspaceAvatarCropPreviewUrl ? (
        <div
          className="modal-overlay profile-avatar-context-overlay"
          onClick={() => {
            URL.revokeObjectURL(workspaceAvatarCropPreviewUrl)
            setWorkspaceAvatarCropPreviewUrl('')
            setWorkspaceAvatarCropFile(null)
            setWorkspaceAvatarCropSourceUrl(null)
          }}
        >
          <div className="modal avatar-editor-modal profile-avatar-context-window" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="avatar-editor-close"
              aria-label="Close crop editor"
              onClick={() => {
                URL.revokeObjectURL(workspaceAvatarCropPreviewUrl)
                setWorkspaceAvatarCropPreviewUrl('')
                setWorkspaceAvatarCropFile(null)
                setWorkspaceAvatarCropSourceUrl(null)
              }}
            >
              ×
            </button>
            <div className="avatar-crop-body">
              <h4>Adjust thumbnail</h4>
              <p className="muted">Drag with cursor (hand) to position. Use zoom for framing.</p>
              <div
                className="avatar-crop-preview avatar-crop-draggable"
                style={
                  {
                    ['--avatar-crop-x' as string]: `${workspaceAvatarCropX}`,
                    ['--avatar-crop-y' as string]: `${workspaceAvatarCropY}`,
                    ['--avatar-crop-zoom' as string]: `${workspaceAvatarCropZoom}`,
                  }
                }
                onPointerDown={handleWorkspaceCropPointerDown}
                onPointerMove={handleWorkspaceCropPointerMove}
                onPointerUp={handleWorkspaceCropPointerUp}
                onPointerCancel={handleWorkspaceCropPointerUp}
                onWheel={handleWorkspaceCropWheel}
              >
                <span className="workspace-avatar workspace-avatar-xl" aria-hidden="true">
                  <img src={workspaceAvatarCropPreviewUrl} alt="" draggable={false} onDragStart={(event) => event.preventDefault()} />
                </span>
              </div>
              <div className="avatar-crop-sliders">
                <label>
                  Horizontal
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={workspaceAvatarCropX}
                    onChange={(event) => setWorkspaceAvatarCropX(Number(event.target.value))}
                    disabled={workspaceProfileAvatarUploading}
                  />
                </label>
                <label>
                  Vertical
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={workspaceAvatarCropY}
                    onChange={(event) => setWorkspaceAvatarCropY(Number(event.target.value))}
                    disabled={workspaceProfileAvatarUploading}
                  />
                </label>
                <label>
                  Zoom
                  <input
                    type="range"
                    min={100}
                    max={220}
                    step={1}
                    value={workspaceAvatarCropZoom}
                    onChange={(event) => setWorkspaceAvatarCropZoom(Number(event.target.value))}
                    disabled={workspaceProfileAvatarUploading}
                  />
                </label>
              </div>
              <div className="workspace-profile-avatar-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    URL.revokeObjectURL(workspaceAvatarCropPreviewUrl)
                    setWorkspaceAvatarCropPreviewUrl('')
                    setWorkspaceAvatarCropFile(null)
                    setWorkspaceAvatarCropSourceUrl(null)
                  }}
                  disabled={workspaceProfileAvatarUploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApplyWorkspaceAvatarCrop}
                  disabled={workspaceProfileAvatarUploading}
                >
                  {workspaceProfileAvatarUploading ? 'Uploading...' : 'Use image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}





























