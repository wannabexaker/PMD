import type { UiPreferences } from '../ui/uiPreferences'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { useMemo, useState } from 'react'

type SettingsPageProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

export function SettingsPage({ preferences, onChange }: SettingsPageProps) {
  const { activeWorkspace, workspaces, createWorkspace, joinWorkspace, enterDemo, resetDemo, refresh } =
    useWorkspace()
  const { refresh: refreshTeams } = useTeams()
  const { showToast } = useToast()
  const [workspaceName, setWorkspaceName] = useState('')
  const [joinValue, setJoinValue] = useState('')
  const [workspaceBusy, setWorkspaceBusy] = useState(false)

  const sortedWorkspaces = useMemo(
    () => [...workspaces].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [workspaces]
  )
  const demoWorkspaces = useMemo(() => sortedWorkspaces.filter((workspace) => workspace.demo), [sortedWorkspaces])
  const userWorkspaces = useMemo(() => sortedWorkspaces.filter((workspace) => !workspace.demo), [sortedWorkspaces])

  const parseInviteToken = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.includes('token=')) {
      const match = trimmed.match(/[?&]token=([^&]+)/)
      if (match?.[1]) {
        return decodeURIComponent(match[1])
      }
    }
    try {
      const url = new URL(trimmed)
      const token = url.searchParams.get('token')
      if (token) {
        return token
      }
    } catch {
      // not a URL
    }
    return trimmed
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
      showToast({ type: 'success', message: 'Workspace joined.' })
    } else {
      showToast({ type: 'error', message: 'Failed to join workspace.' })
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
            {activeWorkspace?.id ? <span className="pill">Current</span> : null}
          </div>
        </div>
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
                    {activeWorkspace?.id === workspace.id ? <span className="pill">Current</span> : null}
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
      </div>
    </section>
  )
}
