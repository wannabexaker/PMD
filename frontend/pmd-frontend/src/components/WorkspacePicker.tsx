import { useMemo, useState } from 'react'
import { useWorkspace } from '../workspaces/WorkspaceContext'

export function WorkspacePicker() {
  const {
    workspaces,
    loading,
    error,
    setActiveWorkspaceId,
    createWorkspace,
    joinWorkspace,
    enterDemo,
  } = useWorkspace()
  const [name, setName] = useState('')
  const [token, setToken] = useState('')

  const sorted = useMemo(
    () => [...workspaces].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [workspaces]
  )

  return (
    <section className="panel auth-card">
      <div className="panel-header">
        <div>
          <h2>Choose a workspace</h2>
          <p className="muted">Create a new workspace or join with an invite token.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => enterDemo()}>
          Enter demo
        </button>
      </div>
      {error ? <div className="banner error">{error}</div> : null}
      {loading ? <p className="muted">Loading workspaces...</p> : null}
      {sorted.length > 0 ? (
        <div className="workspace-list">
          {sorted.map((workspace) => (
            <button
              key={workspace.id ?? workspace.name}
              type="button"
              className="workspace-item"
              onClick={() => setActiveWorkspaceId(workspace.id ?? null)}
              title={workspace.name ?? ''}
            >
              <div className="workspace-name truncate">{workspace.name ?? 'Untitled'}</div>
              {workspace.demo ? <span className="pill">Demo</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      <div className="workspace-actions">
        <div className="form-field">
          <label htmlFor="workspaceName">Create workspace</label>
          <div className="workspace-row">
            <input
              id="workspaceName"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Workspace name"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => createWorkspace(name)}
            >
              Create
            </button>
          </div>
        </div>
        <div className="form-field">
          <label htmlFor="workspaceToken">Join workspace</label>
          <div className="workspace-row">
            <input
              id="workspaceToken"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Invite token"
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => joinWorkspace(token)}
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
