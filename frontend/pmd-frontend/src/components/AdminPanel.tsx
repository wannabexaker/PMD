import { useState } from 'react'
import type { Project, UserSummary } from '../types'
import { useTeams } from '../teams/TeamsContext'

const SECTIONS = [
  'User management',
  'Teams',
  'Projects',
  'Permissions/Roles',
  'Audit log',
  'Email/SMTP',
] as const

type Section = (typeof SECTIONS)[number]

type AdminPanelProps = {
  users: UserSummary[]
  projects: Project[]
}

export function AdminPanel({ users }: AdminPanelProps) {
  const [active, setActive] = useState<Section>('User management')
  const { teams, createTeam, updateTeam, loading: teamsLoading, error: teamsError, teamById } = useTeams()
  const [newTeamName, setNewTeamName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [editingTeamName, setEditingTeamName] = useState('')
  const [savingTeam, setSavingTeam] = useState(false)

  return (
    <section className="panel admin-panel">
      <div className="panel-header">
        <div>
          <h2>Admin Panel</h2>
          <p className="muted">Manage users, teams, and system settings.</p>
        </div>
      </div>
      <div className="admin-layout">
        <nav className="admin-nav">
          {SECTIONS.map((section) => (
            <button
              key={section}
              type="button"
              className={`admin-nav-item${active === section ? ' active' : ''}`}
              onClick={() => setActive(section)}
            >
              {section}
            </button>
          ))}
        </nav>
        <div className="admin-content">
          {active === 'User management' ? (
            <div className="card">
              <h3>Users</h3>
              <ul className="list compact">
                {users.length === 0 ? <li className="muted">No users available.</li> : null}
                {users.map((user, index) => (
                  <li key={user.id ?? user.email ?? 'user-' + index} className="row space">
                    <div>
                      <strong>{user.displayName ?? '-'}</strong>
                      <div className="muted">{user.email ?? ''}</div>
                      <div className="muted">
                        {teamById.get(user.teamId ?? '')?.name ?? user.team ?? 'Team'}
                      </div>
                    </div>
                    {user.isAdmin ? <span className="admin-badge">Admin</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {active === 'Teams' ? (
            <div className="card">
              <h3>Teams</h3>
              <div className="row space">
                <input
                  type="text"
                  placeholder="New team name"
                  value={newTeamName}
                  onChange={(event) => setNewTeamName(event.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={creating || !newTeamName.trim()}
                  onClick={async () => {
                    setCreating(true)
                    const created = await createTeam(newTeamName)
                    setCreating(false)
                    if (created?.id) {
                      setNewTeamName('')
                    }
                  }}
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
              {teamsError ? <p className="error">{teamsError}</p> : null}
              <ul className="list compact">
                {teamsLoading && teams.length === 0 ? <li className="muted">Loading teams...</li> : null}
                {teams.length === 0 && !teamsLoading ? <li className="muted">No teams found.</li> : null}
                {teams.map((team) => {
                  const isEditing = editingTeamId === team.id
                  return (
                    <li key={team.id ?? team.name} className="row space">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingTeamName}
                          onChange={(event) => setEditingTeamName(event.target.value)}
                        />
                      ) : (
                        <span className="truncate" title={team.name ?? ''}>
                          {team.name ?? '-'}
                        </span>
                      )}
                      <div className="actions-right">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={savingTeam || !editingTeamName.trim() || !team.id}
                              onClick={async () => {
                                if (!team.id) return
                                setSavingTeam(true)
                                const updated = await updateTeam(team.id, { name: editingTeamName.trim() })
                                setSavingTeam(false)
                                if (updated) {
                                  setEditingTeamId(null)
                                  setEditingTeamName('')
                                }
                              }}
                            >
                              {savingTeam ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => {
                                setEditingTeamId(null)
                                setEditingTeamName('')
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => {
                              setEditingTeamId(team.id ?? null)
                              setEditingTeamName(team.name ?? '')
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {active === 'Projects' ? (
            <div className="card">
              <h3>Projects</h3>
              <p className="muted">Project maintenance coming soon.</p>
            </div>
          ) : null}

          {active === 'Permissions/Roles' ? (
            <div className="card">
              <h3>Permissions/Roles</h3>
              <p className="muted">Coming soon.</p>
            </div>
          ) : null}

          {active === 'Audit log' ? (
            <div className="card">
              <h3>Audit log</h3>
              <p className="muted">Coming soon.</p>
            </div>
          ) : null}

          {active === 'Email/SMTP' ? (
            <div className="card">
              <h3>Email/SMTP</h3>
              <p className="muted">Coming soon.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

