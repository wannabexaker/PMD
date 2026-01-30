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
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  const [teamName, setTeamName] = useState('')
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')
  const [teamError, setTeamError] = useState<string | null>(null)
  const [roles, setRoles] = useState<WorkspaceRole[]>([])
  const [rolesLoading, setRolesLoading] = useState(false)
  const [rolesError, setRolesError] = useState<string | null>(null)
  const [roleName, setRoleName] = useState('')
  const [rolePermissions, setRolePermissions] = useState<WorkspacePermissions>({ ...DEFAULT_ROLE_PERMISSIONS })
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRolePermissions, setEditingRolePermissions] = useState<WorkspacePermissions>({
    ...DEFAULT_ROLE_PERMISSIONS,
  })
  const [members, setMembers] = useState<UserSummary[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRoleId, setAssignRoleId] = useState('')
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences | null>(null)
  const [notificationBusy, setNotificationBusy] = useState(false)

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
    if (!activeWorkspaceId) {
      setRoles([])
      setMembers([])
      return
    }
    loadRoles(activeWorkspaceId)
    if (canManageRoles) {
      loadMembers(activeWorkspaceId)
    } else {
      setMembers([])
    }
  }, [activeWorkspaceId, canManageRoles, loadMembers, loadRoles])

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
  }

  const handleSaveTeam = async () => {
    if (!editingTeamId) return
    const name = editingTeamName.trim()
    if (name.length < 2 || name.length > 40) {
      setTeamError('Team name must be 2-40 characters.')
      return
    }
    const updated = await updateTeam(editingTeamId, { name })
    if (updated?.id) {
      setEditingTeamId(null)
      setEditingTeamName('')
      setTeamError(null)
      await refreshTeams()
      showToast({ type: 'success', message: 'Team updated.' })
    } else {
      showToast({ type: 'error', message: 'Failed to update team.' })
    }
  }
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
  }

  const handleCreateRole = async () => {
    if (!activeWorkspaceId) return
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
    } catch {
      showToast({ type: 'error', message: 'Failed to create role.' })
    }
  }

  const handleSaveRole = async () => {
    if (!activeWorkspaceId || !editingRoleId) return
    const name = editingRoleName.trim()
    if (name.length < 2 || name.length > 40) {
      showToast({ type: 'error', message: 'Role name must be 2-40 characters.' })
      return
    }
    try {
      await updateRole(activeWorkspaceId, editingRoleId, {
        name,
        permissions: editingRolePermissions,
      })
      setEditingRoleId(null)
      setEditingRoleName('')
      setEditingRolePermissions({ ...DEFAULT_ROLE_PERMISSIONS })
      await loadRoles(activeWorkspaceId)
      showToast({ type: 'success', message: 'Role updated.' })
    } catch {
      showToast({ type: 'error', message: 'Failed to update role.' })
    }
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


  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Settings</h2>
          <p className="muted">Control how selections persist while you navigate.</p>
        </div>
      </div>
      <div className="card">
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
      </div>
      <div className="settings-grid">
        <div className="card settings-card">
          <div className="panel-header">
            <div>
              <h3>Workspaces</h3>
              <p className="muted">Create or join workspaces using an invite token or link.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Your workspaces</h4>
                <p className="muted">Workspaces you belong to.</p>
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
                <p className="muted">No workspaces yet.</p>
              )}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Demo workspaces</h4>
                <p className="muted">Explore seeded data without affecting real workspaces.</p>
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
                <p className="muted">Create, join, or manage your current workspace.</p>
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
              {activeWorkspace?.id && (canInviteMembers || canApproveRequests) ? (
                <div className="workspace-management">
                  {canInviteMembers ? (
                    <div className="workspace-subpanel">
                      <div className="panel-header">
                        <div>
                          <h4>Invites</h4>
                          <p className="muted">Generate invite links or codes for this workspace.</p>
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
                                      ? ` · ${remaining} uses left`
                                      : ' · Unlimited uses'}
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
                          <p className="muted">Approve or deny pending join requests.</p>
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
        </div>
        <div className="card settings-card">
          <div className="panel-header">
            <div>
              <h3>Teams</h3>
              <p className="muted">Create and manage teams inside the current workspace.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Teams</h4>
                <p className="muted">All teams in this workspace.</p>
              </div>
              {teams.length === 0 ? <p className="muted">No teams yet.</p> : null}
              {teams.length > 0 ? (
                <div className="workspace-list compact settings-scroll">
                  {teams.map((team) => (
                    <div key={team.id ?? team.name} className="workspace-item compact">
                      {editingTeamId === team.id && canEditTeams ? (
                        <div className="workspace-row">
                          <input
                            value={editingTeamName}
                            onChange={(event) => {
                              setEditingTeamName(event.target.value)
                              if (teamError) setTeamError(null)
                            }}
                          />
                          <button type="button" className="btn btn-secondary" onClick={handleSaveTeam}>
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="workspace-name truncate" title={team.name ?? ''}>
                          {team.name ?? 'Untitled'}
                        </div>
                      )}
                      <div className="workspace-badges">
                        {team.isActive === false ? <span className="pill">Inactive</span> : null}
                        {canEditTeams && editingTeamId !== team.id ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleStartEditTeam(team.id, team.name)}
                          >
                            Rename
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Team actions</h4>
                <p className="muted">Add, rename, or disable teams.</p>
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
                      disabled={!canEditTeams}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCreateTeam}
                      disabled={!canEditTeams}
                      title={!canEditTeams ? 'You do not have permission to manage teams.' : undefined}
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
                {canEditTeams ? (
                  <div className="form-field">
                    <label>Deactivate teams</label>
                    <div className="workspace-list compact">
                      {teams.map((team) => (
                        <div key={`toggle-${team.id ?? team.name}`} className="workspace-row">
                          <span className="truncate" title={team.name ?? ''}>
                            {team.name ?? 'Untitled'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleToggleTeamActive(team.id, !(team.isActive ?? true))}
                            disabled={!team.id}
                          >
                            {team.isActive === false ? 'Restore' : 'Deactivate'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="card settings-card">
          <div className="panel-header">
            <div>
              <h3>Notifications</h3>
              <p className="muted">Control which emails you receive.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Mail</h4>
                <p className="muted">Verification emails always send.</p>
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
                </div>
              ) : (
                <p className="muted">Loading preferences...</p>
              )}
            </div>
          </div>
        </div>
        <div className="card settings-card">
          <div className="panel-header">
            <div>
              <h3>Roles</h3>
              <p className="muted">Manage workspace roles and permissions.</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Roles</h4>
                <p className="muted">Define access for each role.</p>
              </div>
              {rolesLoading ? <p className="muted">Loading roles...</p> : null}
              {rolesError ? <p className="field-error">{rolesError}</p> : null}
              {!rolesLoading && roles.length === 0 ? <p className="muted">No roles yet.</p> : null}
              {roles.length > 0 ? (
                <div className="workspace-list compact settings-scroll">
                  {roles.map((role) => (
                    <div key={role.id ?? role.name} className="workspace-item compact">
                      <div className="workspace-name truncate" title={role.name ?? ''}>
                        {role.name ?? 'Untitled'}
                      </div>
                      <div className="workspace-badges">
                        {role.system ? <span className="pill">System</span> : null}
                        {canEditRoles ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleStartEditRole(role)}
                          >
                            Edit
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="workspace-divider" />
            <div className="workspace-group">
              <div className="workspace-group-header">
                <h4>Role actions</h4>
                <p className="muted">Create roles, edit permissions, and assign members.</p>
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
                      disabled={!canEditRoles}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCreateRole}
                      disabled={!canEditRoles}
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
                {editingRoleId ? (
                  <div className="form-field">
                    <label>Edit role</label>
                    <div className="workspace-row">
                      <input
                        value={editingRoleName}
                        onChange={(event) => setEditingRoleName(event.target.value)}
                        disabled={!canEditRoles}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleSaveRole}
                        disabled={!canEditRoles}
                      >
                        Save
                      </button>
                    </div>
                    <div className="settings-permissions">
                      {ROLE_PERMISSION_GROUPS.map((group) => (
                        <div key={`edit-${group.label}`} className="settings-permission-group">
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
                  </div>
                ) : null}
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
        </div>
      </div>
    </section>
  )
}




























