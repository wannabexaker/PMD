import type { UiPreferences } from '../ui/uiPreferences'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { useAuth } from '../auth/authUtils'
import {
  approveJoinRequest,
  createInvite,
  denyJoinRequest,
  listInvites,
  listJoinRequests,
  revokeInvite,
  updateWorkspaceSettings,
} from '../api/workspaces'
import type { WorkspaceInvite, WorkspaceJoinRequest } from '../types'
import { useEffect, useMemo, useState } from 'react'

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
  const { refresh: refreshTeams } = useTeams()
  const { showToast } = useToast()
  const [workspaceName, setWorkspaceName] = useState('')
  const [joinValue, setJoinValue] = useState('')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)
  const [inviteDays, setInviteDays] = useState('7')
  const [inviteMaxUses, setInviteMaxUses] = useState('10')
  const [invites, setInvites] = useState<WorkspaceInvite[]>([])
  const [invitesLoading, setInvitesLoading] = useState(false)
  const [requests, setRequests] = useState<WorkspaceJoinRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [settingsBusy, setSettingsBusy] = useState(false)

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [workspaces]
  )
  const demoWorkspaces = useMemo(() => sortedWorkspaces.filter((workspace) => workspace.demo), [sortedWorkspaces])
  const userWorkspaces = useMemo(() => sortedWorkspaces.filter((workspace) => !workspace.demo), [sortedWorkspaces])
  const isAdmin = Boolean(user?.isAdmin)
  const canManageWorkspace =
    Boolean(activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN') || isAdmin

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

  const loadInvites = async (workspaceId: string) => {
    setInvitesLoading(true)
    try {
      const data = await listInvites(workspaceId)
      setInvites(data)
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to load invites.' })
    } finally {
      setInvitesLoading(false)
    }
  }

  const loadRequests = async (workspaceId: string) => {
    setRequestsLoading(true)
    try {
      const data = await listJoinRequests(workspaceId)
      setRequests(data)
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to load join requests.' })
    } finally {
      setRequestsLoading(false)
    }
  }

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
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to create invite.' })
    }
  }

  const handleRevokeInvite = async (inviteId?: string | null) => {
    if (!activeWorkspaceId || !inviteId) return
    try {
      await revokeInvite(activeWorkspaceId, inviteId)
      await loadInvites(activeWorkspaceId)
      showToast({ type: 'success', message: 'Invite revoked.' })
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to revoke invite.' })
    }
  }

  const handleCopy = async (value: string, label: string) => {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
      showToast({ type: 'success', message: `${label} copied.` })
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to approve request.' })
    }
  }

  const handleDenyRequest = async (requestId?: string | null) => {
    if (!activeWorkspaceId || !requestId) return
    try {
      await denyJoinRequest(activeWorkspaceId, requestId)
      await loadRequests(activeWorkspaceId)
      showToast({ type: 'success', message: 'Request denied.' })
    } catch (err) {
      showToast({ type: 'error', message: 'Failed to deny request.' })
    }
  }

  useEffect(() => {
    if (!activeWorkspaceId || !canManageWorkspace) {
      setInvites([])
      setRequests([])
      return
    }
    loadInvites(activeWorkspaceId)
    loadRequests(activeWorkspaceId)
  }, [activeWorkspaceId, canManageWorkspace])

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
      <div className="card">
        <div className="panel-header">
          <div>
            <h3>Workspaces</h3>
            <p className="muted">Create or join workspaces using an invite token or link.</p>
          </div>
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
        {canManageWorkspace && activeWorkspace?.id ? (
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
        <div className="workspace-groups">
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
              <div className="workspace-list compact">
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
              <h4>Your workspaces</h4>
            </div>
            {userWorkspaces.length > 0 ? (
              <div className="workspace-list compact">
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
        </div>
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
              <button type="button" className="btn btn-primary" onClick={handleCreateWorkspace} disabled={workspaceBusy}>
                Create
              </button>
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
              <button type="button" className="btn btn-secondary" onClick={handleJoinWorkspace} disabled={workspaceBusy}>
                Join
              </button>
            </div>
          </div>
        </div>
        {activeWorkspace?.id && canManageWorkspace ? (
          <div className="workspace-management">
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
                            {typeof remaining === 'number' ? ` · ${remaining} uses left` : ' · Unlimited uses'}
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
          </div>
        ) : null}
      </div>
    </section>
  )
}
