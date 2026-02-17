import type { UiPreferences } from '../ui/uiPreferences'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { useAuth } from '../auth/authUtils'
import { getNotificationPreferences, updateNotificationPreferences } from '../api/notifications'
import {
  approveJoinRequest,
  createInvite,
  createRole,
  denyJoinRequest,
  listInvites,
  listJoinRequests,
  listRoles,
  revokeInvite,
  assignMemberRole,
  updateRole,
  updateWorkspaceSettings,
} from '../api/workspaces'
import { fetchUsers } from '../api/users'
import type { WorkspaceInvite, WorkspaceJoinRequest, WorkspaceRole, WorkspacePermissions, UserSummary, NotificationPreferences } from '../types'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'

type SettingsPanelId = 'preferences' | 'workspaces' | 'teams' | 'notifications' | 'roles'

const SETTINGS_PANEL_IDS: SettingsPanelId[] = ['workspaces', 'teams', 'roles', 'preferences', 'notifications']

const SETTINGS_PANEL_ORDER_DEFAULT: SettingsPanelId[] = [
  'workspaces',
  'teams',
  'roles',
  'preferences',
  'notifications',
]

const PANEL_MIN_HEIGHT: Record<SettingsPanelId, number> = {
  preferences: 260,
  workspaces: 380,
  teams: 380,
  notifications: 340,
  roles: 420,
}

const PANEL_MAX_HEIGHT: Record<SettingsPanelId, number> = {
  preferences: 560,
  workspaces: 900,
  teams: 900,
  notifications: 820,
  roles: 960,
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
  emailOnProjectStatusChange: true,
  emailOnProjectMembershipChange: true,
  emailOnOverdueReminder: true,
}

type SettingsPageProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

export function SettingsPage({ preferences, onChange }: SettingsPageProps) {
  const {
    activeWorkspace,
    activeWorkspaceId,
    workspaces,
    createWorkspace,
    joinWorkspace,
    enterDemo,
    resetDemo,
    refresh,
  } = useWorkspace()
  const { user } = useAuth()
  const { teams, createTeam, updateTeam, refresh: refreshTeams } = useTeams()
  const { showToast } = useToast()
  const [workspaceName, setWorkspaceName] = useState('')
  const [initialTeams, setInitialTeams] = useState<string[]>(['General'])
  const [joinValue, setJoinValue] = useState('')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [inviteDays, setInviteDays] = useState('7')
  const [inviteMaxUses, setInviteMaxUses] = useState('10')
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [requests, setRequests] = useState<WorkspaceJoinRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)
  const [workspaceProfileName, setWorkspaceProfileName] = useState('')
  const [workspaceProfileSlug, setWorkspaceProfileSlug] = useState('')
  const [workspaceProfileLanguage, setWorkspaceProfileLanguage] = useState('')
  const [workspaceProfileAvatarUrl, setWorkspaceProfileAvatarUrl] = useState('')
  const [workspaceProfileDescription, setWorkspaceProfileDescription] = useState('')
  const [teamName, setTeamName] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')
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
  const [draggingPanel, setDraggingPanel] = useState<SettingsPanelId | null>(null)
  const [dragOverPanel, setDragOverPanel] = useState<SettingsPanelId | 'end' | null>(null)
  const [orderMenuPanel, setOrderMenuPanel] = useState<SettingsPanelId | null>(null)
  const [orderTargetPosition, setOrderTargetPosition] = useState(1)
  const [panelHeights, setPanelHeights] = useState<Record<SettingsPanelId, number>>({
    preferences: 320,
    workspaces: 620,
    teams: 620,
    notifications: 520,
    roles: 700,
  })
  const [panelRowSpans, setPanelRowSpans] = useState<Record<SettingsPanelId, number>>({
    preferences: 1,
    workspaces: 1,
    teams: 1,
    notifications: 1,
    roles: 1,
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
  })

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [workspaces]
  )
  const demoWorkspaces = useMemo(() => sortedWorkspaces.filter((workspace) => workspace.demo), [sortedWorkspaces])
  const userWorkspaces = useMemo(() => sortedWorkspaces.filter((workspace) => !workspace.demo), [sortedWorkspaces])
  const isAdmin = Boolean(user?.isAdmin)
  const permissions = activeWorkspace?.permissions ?? {}
  const canManageWorkspaceSettings = Boolean(permissions.manageWorkspaceSettings) || isAdmin
  const canInviteMembers = Boolean(permissions.inviteMembers) || isAdmin
  const canApproveRequests = Boolean(permissions.approveJoinRequests) || isAdmin
  const canManageTeams = Boolean(permissions.manageTeams) || isAdmin || Boolean(activeWorkspace?.demo)
  const canManageRoles = Boolean(permissions.manageRoles) || isAdmin || Boolean(activeWorkspace?.demo)
  const canEditTeams = canManageTeams && Boolean(activeWorkspaceId)
  const canEditRoles = canManageRoles && Boolean(activeWorkspaceId)
  const workspaceRole = `${activeWorkspace?.roleName ?? activeWorkspace?.role ?? ''}`.toLocaleLowerCase()
  const canCreateTeamsByRole =
    isAdmin || workspaceRole.includes('owner') || workspaceRole.includes('manager') || workspaceRole.includes('admin')
  const canCreateTeams = canEditTeams && canCreateTeamsByRole

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

  const editingRole = useMemo(
    () => roles.find((role) => role.id === editingRoleId) ?? null,
    [roles, editingRoleId]
  )
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
    (id: SettingsPanelId) => ({
      order: panelOrder.indexOf(id) + 1,
      height: `${panelHeights[id]}px`,
      gridRowEnd: `span ${panelRowSpans[id]}`,
    }),
    [panelHeights, panelOrder, panelRowSpans]
  )

  const handleResizeStart = useCallback(
    (id: SettingsPanelId, edge: 'top' | 'bottom') =>
      (event: ReactMouseEvent<HTMLDivElement>) => {
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
    [panelHeights]
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
      const message = err instanceof Error ? err.message : 'Failed to load roles.'
      setRolesError(message)
      showToast({ type: 'error', message })
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

  const handleEnterDemo = async () => {
    const demo = await enterDemo()
    if (demo?.id) {
      showToast({ type: 'success', message: 'Entered Demo Workspace.' })
    } else {
      showToast({ type: 'error', message: 'Failed to enter Demo Workspace.' })
    }
  }

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
    const created = await createWorkspace(name, initialTeams)
    setWorkspaceBusy(false)
    if (created?.id) {
      setWorkspaceName('')
      setInitialTeams(['General'])
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
    setWorkspaceBusy(true)
    const joined = await joinWorkspace(token)
    setWorkspaceBusy(false)
    if (joined?.id) {
      setJoinValue('')
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
    try {
      await createInvite(activeWorkspaceId, { expiresAt, maxUses: maxUsesValue })
      await loadInvites(activeWorkspaceId)
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
    if (!activeWorkspaceId || !canApproveRequests) {
      setRequests([])
      return
    }
    loadRequests(activeWorkspaceId)
  }, [activeWorkspaceId, canApproveRequests, loadRequests])

  useEffect(() => {
    setWorkspaceProfileName(activeWorkspace?.name ?? '')
    setWorkspaceProfileSlug(activeWorkspace?.slug ?? '')
    setWorkspaceProfileLanguage(activeWorkspace?.language ?? '')
    setWorkspaceProfileAvatarUrl(activeWorkspace?.avatarUrl ?? '')
    setWorkspaceProfileDescription(activeWorkspace?.description ?? '')
  }, [
    activeWorkspace?.id,
    activeWorkspace?.name,
    activeWorkspace?.slug,
    activeWorkspace?.language,
    activeWorkspace?.avatarUrl,
    activeWorkspace?.description,
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

  const handleAddInitialTeam = () => {
    setInitialTeams((prev) => [...prev, ''])
  }

  const handleRemoveInitialTeam = (index: number) => {
    setInitialTeams((prev) => prev.filter((_, idx) => idx !== index))
  }

  const handleUpdateInitialTeam = (index: number, value: string) => {
    setInitialTeams((prev) => prev.map((team, idx) => (idx === index ? value : team)))
  }

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
    const created = await createTeam(name)
    if (created?.id) {
      setTeamName('')
      setTeamError(null)
      await refreshTeams()
      showToast({ type: 'success', message: 'Team created.' })
    } else {
      showToast({ type: 'error', message: 'Failed to create team.' })
    }
  }

  const handleStartEditTeam = (id?: string | null, name?: string | null) => {
    if (!id) return
    setEditingTeamId(id)
    setEditingTeamName(name ?? '')
    setEditingTeamAction(null)
    setTeamError(null)
  }

  const handleCancelEditTeam = () => {
    setEditingTeamId(null)
    setEditingTeamName('')
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
    const updated = await updateTeam(editingTeamId, { name })
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
    if (!activeWorkspaceId || !canManageWorkspaceSettings) return
    const trimmedName = workspaceProfileName.trim()
    if (!trimmedName) {
      showToast({ type: 'error', message: 'Workspace name is required.' })
      return
    }
    setSettingsBusy(true)
    try {
      await updateWorkspaceSettings(activeWorkspaceId, {
        name: trimmedName,
        slug: workspaceProfileSlug.trim() || undefined,
        language: workspaceProfileLanguage.trim() || undefined,
        avatarUrl: workspaceProfileAvatarUrl.trim() || undefined,
        description: workspaceProfileDescription.trim(),
      })
      await refresh()
      showToast({ type: 'success', message: 'Workspace profile updated.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to update workspace profile.' })
    } finally {
      setSettingsBusy(false)
    }
  }

  useEffect(() => {
    if (!editingTeamId) return
    if (!canEditTeams || !teams.some((team) => team.id === editingTeamId)) {
      handleCancelEditTeam()
    }
  }, [canEditTeams, editingTeamId, teams])

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
      const message = err instanceof Error ? err.message : 'Failed to create role.'
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
    } catch {
      showToast({ type: 'error', message: 'Failed to update role.' })
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
    } catch {
      showToast({ type: 'error', message: 'Failed to reset role defaults.' })
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
    } catch {
      showToast({ type: 'error', message: 'Failed to assign role.' })
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
      const nextHeight = Math.max(PANEL_MIN_HEIGHT[activeResize.id], Math.min(PANEL_MAX_HEIGHT[activeResize.id], Math.round(rawHeight)))
      setPanelHeights((prev) => ({ ...prev, [activeResize.id]: nextHeight }))
    }
    const handleMouseUp = () => setActiveResize(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeResize])

  useEffect(() => {
    if (activeResize) return
    const fitPanel = (id: SettingsPanelId) => {
      const card = panelRefs.current[id]
      if (!card) return
      const header = card.querySelector('.panel-header') as HTMLElement | null
      const body = card.querySelector('.settings-card-body') as HTMLElement | null
      if (!header || !body) return
      const desired = header.offsetHeight + body.scrollHeight + 28
      const nextHeight = Math.max(PANEL_MIN_HEIGHT[id], Math.min(PANEL_MAX_HEIGHT[id], Math.round(desired)))
      setPanelHeights((prev) => (prev[id] === nextHeight ? prev : { ...prev, [id]: nextHeight }))
    }
    const raf = window.requestAnimationFrame(() => {
      SETTINGS_PANEL_IDS.forEach((id) => fitPanel(id))
    })
    return () => window.cancelAnimationFrame(raf)
  }, [
    activeResize,
    panelOrder,
    userWorkspaces.length,
    demoWorkspaces.length,
    invites.length,
    requests.length,
    teams.length,
    roles.length,
    members.length,
    notificationPreferences,
    workspaceName,
    teamName,
    roleName,
    editingTeamId,
    editingRoleId,
  ])

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
    }
    SETTINGS_PANEL_IDS.forEach((id) => {
      const card = panelRefs.current[id]
      if (!card) return
      const height = card.getBoundingClientRect().height
      const span = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)))
      nextSpans[id] = span
    })
    setPanelRowSpans((prev) => {
      const changed = SETTINGS_PANEL_IDS.some((id) => prev[id] !== nextSpans[id])
      return changed ? nextSpans : prev
    })
  }, [panelHeights, panelOrder, draggingPanel, dragOverPanel])

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
        <div className="settings-order-popover" onClick={(event) => event.stopPropagation()}>
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
        </div>
      ) : null}
    </div>
  )


  return (
    <section className="panel settings-page-panel">
      <div className="panel-header">
        <div>
          <h2>Settings</h2>
        </div>
      </div>
      <div className="settings-grid">
        <div
          className={`card settings-card settings-card-compact${dragOverPanel === 'preferences' ? ' is-drop-target' : ''}`}
          ref={setPanelRef('preferences')}
          style={panelCardStyle('preferences')}
          onDragOver={handlePanelDragOver('preferences')}
          onDrop={handlePanelDrop('preferences')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'preferences' ? null : prev))}
        >
          <div className="settings-resize-handle top" onMouseDown={handleResizeStart('preferences', 'top')} />
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Preferences</h3>
            </div>
            {renderOrderControl('preferences', 'Preferences')}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
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
              <div className="workspace-divider" />
              <div className="workspace-group-header">
                <h4>Coming soon</h4>
              </div>
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
            </div>
          </div>
          <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('preferences', 'bottom')} />
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'workspaces' ? ' is-drop-target' : ''}`}
          ref={setPanelRef('workspaces')}
          style={panelCardStyle('workspaces')}
          onDragOver={handlePanelDragOver('workspaces')}
          onDrop={handlePanelDrop('workspaces')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'workspaces' ? null : prev))}
        >
          <div className="settings-resize-handle top" onMouseDown={handleResizeStart('workspaces', 'top')} />
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Workspaces</h3>
            </div>
            {renderOrderControl('workspaces', 'Workspaces')}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Your workspaces</h4>
              </div>
              {userWorkspaces.length > 0 ? (
                <div className="workspace-list compact settings-scroll">
                  {userWorkspaces.map((workspace) => (
                    <div key={workspace.id ?? workspace.name} className="workspace-item compact">
                      <div className="workspace-name truncate" title={workspace.name ?? ''}>
                        {workspace.name ?? 'Untitled'}
                      </div>
                      <div className="workspace-badges">
                        {workspace.status === 'PENDING' ? <span className="pill">Pending</span> : null}
                        {activeWorkspace?.id === workspace.id ? <span className="pill">Current</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No workspaces yet. Create your first workspace below.</p>
              )}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Demo workspaces</h4>
              </div>
              <div className="row space">
                <button type="button" className="btn btn-secondary" onClick={handleEnterDemo}>
                  Enter Demo Workspace
                </button>
                {activeWorkspace?.demo ? (
                  <button type="button" className="btn btn-danger" onClick={handleResetDemo}>
                    Reset Demo Workspace
                  </button>
                ) : null}
              </div>
              {demoWorkspaces.length > 0 ? (
                <div className="workspace-list compact settings-scroll">
                  {demoWorkspaces.map((workspace) => (
                    <div key={workspace.id ?? workspace.name} className="workspace-item compact">
                      <div className="workspace-name truncate" title={workspace.name ?? ''}>
                        {workspace.name ?? 'Untitled'}
                      </div>
                      <div className="workspace-badges">
                        <span className="pill">Demo</span>
                        {workspace.status === 'PENDING' ? <span className="pill">Pending</span> : null}
                        {activeWorkspace?.id === workspace.id ? <span className="pill">Current</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">No demo workspaces yet.</p>
              )}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Workspace actions</h4>
              </div>
              <div className="workspace-current">
                <span className="muted">Current workspace</span>
                <div className="workspace-current-row">
                  <strong className="truncate" title={activeWorkspace?.name ?? 'None'}>
                    {activeWorkspace?.name ?? 'None selected'}
                  </strong>
                  {activeWorkspace?.demo ? <span className="pill">Demo</span> : null}
                  {activeWorkspace?.status === 'PENDING' ? <span className="pill">Pending</span> : null}
                  {activeWorkspace?.id ? <span className="pill">Current</span> : null}
                </div>
                {activeWorkspace?.status === 'PENDING' ? (
                  <p className="muted">This workspace is pending approval.</p>
                ) : null}
              </div>
              {canManageWorkspaceSettings && activeWorkspace?.id ? (
                <div className="form-field">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(activeWorkspace?.requireApproval)}
                      onChange={(event) => handleToggleApproval(event.target.checked)}
                      disabled={settingsBusy}
                    />
                    <span>Require approval to join</span>
                  </label>
                </div>
              ) : null}
              {canManageWorkspaceSettings && activeWorkspace?.id ? (
                <div className="form-field">
                  <label>Workspace profile</label>
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
                      <input
                        value={workspaceProfileAvatarUrl}
                        onChange={(event) => setWorkspaceProfileAvatarUrl(event.target.value)}
                        placeholder="Avatar URL"
                      />
                    </div>
                    <textarea
                      value={workspaceProfileDescription}
                      onChange={(event) => setWorkspaceProfileDescription(event.target.value)}
                      placeholder="Workspace description"
                      rows={3}
                    />
                    <div className="workspace-inline-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSaveWorkspaceProfile}
                        disabled={settingsBusy}
                      >
                        Save profile
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="workspace-actions">
                <div className="form-field">
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
                  <div className="form-field compact">
                    <label>Initial teams</label>
                    <div className="workspace-list compact">
                      {initialTeams.map((team, index) => (
                        <div key={`${team}-${index}`} className="workspace-row">
                          <input
                            value={team}
                            onChange={(event) => handleUpdateInitialTeam(index, event.target.value)}
                            placeholder="Team name"
                          />
                          {initialTeams.length > 1 ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => handleRemoveInitialTeam(index)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      ))}
                      <button type="button" className="btn btn-secondary" onClick={handleAddInitialTeam}>
                        Add team
                      </button>
                    </div>
                  </div>
                </div>
                <div className="form-field">
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
                </div>
              </div>
              <div className="workspace-divider" />
              <div className="workspace-group-header">
                <h4>Coming soon</h4>
              </div>
              <div className="workspace-actions">
                <button type="button" className="btn btn-danger coming-soon-button" disabled>
                  Member lifecycle (suspend/remove/re-activate) - Coming soon
                </button>
                <button type="button" className="btn btn-danger coming-soon-button" disabled>
                  Default role on join invite - Coming soon
                </button>
                <button type="button" className="btn btn-danger coming-soon-button" disabled>
                  Audit log - Coming soon
                </button>
                <button type="button" className="btn btn-danger coming-soon-button" disabled>
                  Workspace limits (projects/members/storage) - Coming soon
                </button>
                <button type="button" className="btn btn-danger coming-soon-button" disabled>
                  Export/backup data (admin only) - Coming soon
                </button>
              </div>
              {activeWorkspace?.id && (canInviteMembers || canApproveRequests) ? (
                <div className="workspace-management">
                  {canInviteMembers ? (
                    <div className="workspace-subpanel">
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
                                  </div>
                                </div>
                                <div className="invite-actions">
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => handleCopy(link, 'Invite link')}
                                  >
                                    Copy link
                                  </button>
                                  {invite.code ? (
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      onClick={() => handleCopy(invite.code ?? '', 'Invite code')}
                                    >
                                      Copy code
                                    </button>
                                  ) : null}
                                  {!invite.revoked ? (
                                    <button
                                      type="button"
                                      className="btn btn-danger"
                                      onClick={() => handleRevokeInvite(invite.id)}
                                    >
                                      Revoke
                                    </button>
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
                    <div className="workspace-subpanel">
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
                </div>
              ) : null}
            </div>
          </div>
          <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('workspaces', 'bottom')} />
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'teams' ? ' is-drop-target' : ''}`}
          ref={setPanelRef('teams')}
          style={panelCardStyle('teams')}
          onDragOver={handlePanelDragOver('teams')}
          onDrop={handlePanelDrop('teams')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'teams' ? null : prev))}
        >
          <div className="settings-resize-handle top" onMouseDown={handleResizeStart('teams', 'top')} />
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Teams</h3>
            </div>
            {renderOrderControl('teams', 'Teams')}
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
                          {team.name ?? 'Untitled'}
                        </div>
                        <div className="workspace-inline-actions">
                          <span className="pill team-member-count">{teamMemberCountById.get(team.id ?? '') ?? 0}</span>
                          {team.isActive === false ? <span className="pill">Inactive</span> : null}
                          {canEditTeams && editingTeamId !== team.id ? (
                            <button
                              type="button"
                              className="btn btn-secondary team-edit-trigger"
                              onClick={() => handleStartEditTeam(team.id, team.name)}
                            >
                              Edit
                            </button>
                          ) : null}
                        </div>
                      </div>
                      {editingTeamId === team.id && canEditTeams ? (
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
                  <p className="field-error">{teamError ?? ''}</p>
                  {!activeWorkspaceId ? <p className="muted">Select a workspace to manage teams.</p> : null}
                  {activeWorkspaceId && !canManageTeams ? (
                    <p className="muted">You do not have permission to manage teams.</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('teams', 'bottom')} />
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'notifications' ? ' is-drop-target' : ''}`}
          ref={setPanelRef('notifications')}
          style={panelCardStyle('notifications')}
          onDragOver={handlePanelDragOver('notifications')}
          onDrop={handlePanelDrop('notifications')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'notifications' ? null : prev))}
        >
          <div className="settings-resize-handle top" onMouseDown={handleResizeStart('notifications', 'top')} />
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Notifications</h3>
            </div>
            {renderOrderControl('notifications', 'Notifications')}
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Mail</h4>
              </div>
              {notificationPreferences ? (
                <div className="workspace-actions">
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.emailOnAssign}
                      onChange={(event) => handleNotificationToggle('emailOnAssign', event.target.checked)}
                      disabled={notificationBusy}
                    />
                    <span>Email when assigned</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.emailOnMentionUser}
                      onChange={(event) => handleNotificationToggle('emailOnMentionUser', event.target.checked)}
                      disabled={notificationBusy}
                    />
                    <span>Email on @mention</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.emailOnMentionTeam}
                      onChange={(event) => handleNotificationToggle('emailOnMentionTeam', event.target.checked)}
                      disabled={notificationBusy}
                    />
                    <span>Email on @teammention</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.emailOnProjectStatusChange}
                      onChange={(event) => handleNotificationToggle('emailOnProjectStatusChange', event.target.checked)}
                      disabled={notificationBusy}
                    />
                    <span>Email when project status changes</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.emailOnProjectMembershipChange}
                      onChange={(event) => handleNotificationToggle('emailOnProjectMembershipChange', event.target.checked)}
                      disabled={notificationBusy}
                    />
                    <span>Email when added/removed from a project</span>
                  </label>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={notificationPreferences.emailOnOverdueReminder}
                      onChange={(event) => handleNotificationToggle('emailOnOverdueReminder', event.target.checked)}
                      disabled={notificationBusy}
                    />
                    <span>Email overdue reminders</span>
                  </label>
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
                  <div className="workspace-divider" />
                  <div className="workspace-group-header">
                    <h4>Coming soon</h4>
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
                      <span>Digest mode (hourly/daily)</span>
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
                      <span>Per-workspace notification profile</span>
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
                </div>
              ) : (
                <p className="muted">Loading preferences...</p>
              )}
            </div>
          </div>
          <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('notifications', 'bottom')} />
        </div>
        <div
          className={`card settings-card${dragOverPanel === 'roles' ? ' is-drop-target' : ''}`}
          ref={setPanelRef('roles')}
          style={panelCardStyle('roles')}
          onDragOver={handlePanelDragOver('roles')}
          onDrop={handlePanelDrop('roles')}
          onDragLeave={() => setDragOverPanel((prev) => (prev === 'roles' ? null : prev))}
        >
          <div className="settings-resize-handle top" onMouseDown={handleResizeStart('roles', 'top')} />
          <div className="panel-header settings-card-handle">
            <div>
              <h3>Roles</h3>
            </div>
            {renderOrderControl('roles', 'Roles')}
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
                      {editingRoleId === role.id && canEditRoles ? (
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
                <div className="form-field">
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
                {canEditRoles ? (
                  <div className="form-field">
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
                <div className="form-field">
                  <label>Assign role</label>
                  <div className="workspace-row">
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
              </div>
            </div>
          </div>
          <div className="settings-resize-handle bottom" onMouseDown={handleResizeStart('roles', 'bottom')} />
        </div>
        {draggingPanel ? (
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
    </section>
  )
}





























