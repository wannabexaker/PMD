import { useCallback, useEffect, useState } from 'react'
import { getAdminOverview, listAdminAudit, listAdminUsers, listAdminWorkspaces } from '../api/admin'
import type { AdminAuditRow, AdminOverview, AdminUserRow, AdminWorkspaceRow } from '../types'

const SECTIONS = ['Overview', 'Workspaces', 'Users', 'Audit log'] as const

type Section = (typeof SECTIONS)[number]

const AUDIT_CATEGORIES = ['', 'WORKSPACE', 'MEMBERSHIP', 'INVITE', 'REQUEST', 'TEAM', 'ROLE', 'PROJECT', 'GENERAL']

export function AdminPanel() {
  const [active, setActive] = useState<Section>('Overview')
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [workspaces, setWorkspaces] = useState<AdminWorkspaceRow[]>([])
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [auditRows, setAuditRows] = useState<AdminAuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userQuery, setUserQuery] = useState('')
  const [auditQ, setAuditQ] = useState('')
  const [auditWorkspaceId, setAuditWorkspaceId] = useState('')
  const [auditActorUserId, setAuditActorUserId] = useState('')
  const [auditCategory, setAuditCategory] = useState('')

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [ov, ws, us, audit] = await Promise.all([
        getAdminOverview(),
        listAdminWorkspaces(),
        listAdminUsers(userQuery),
        listAdminAudit({
          q: auditQ,
          workspaceId: auditWorkspaceId,
          actorUserId: auditActorUserId,
          category: auditCategory,
          limit: 300,
        }),
      ])
      setOverview(ov)
      setWorkspaces(ws)
      setUsers(us)
      setAuditRows(audit)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PMD admin data.')
    } finally {
      setLoading(false)
    }
  }, [auditActorUserId, auditCategory, auditQ, auditWorkspaceId, userQuery])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const refreshUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listAdminUsers(userQuery))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  const refreshAudit = async () => {
    setLoading(true)
    setError(null)
    try {
      setAuditRows(
        await listAdminAudit({
          q: auditQ,
          workspaceId: auditWorkspaceId,
          actorUserId: auditActorUserId,
          category: auditCategory,
          limit: 300,
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

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
          {error ? <p className="error">{error}</p> : null}
          {loading ? <p className="muted">Loading...</p> : null}

          {active === 'Overview' && overview ? (
            <div className="card">
              <h3>PMD Admin overview</h3>
              <div className="stats-strip">
                <div className="stat-box"><div>Users</div><strong>{overview.totalUsers}</strong></div>
                <div className="stat-box"><div>Workspaces</div><strong>{overview.totalWorkspaces}</strong></div>
                <div className="stat-box"><div>Projects</div><strong>{overview.totalProjects}</strong></div>
                <div className="stat-box"><div>Teams</div><strong>{overview.totalTeams}</strong></div>
                <div className="stat-box"><div>Roles</div><strong>{overview.totalRoles}</strong></div>
                <div className="stat-box"><div>Audit events</div><strong>{overview.totalAuditEvents}</strong></div>
              </div>
              <h4>Isolation integrity</h4>
              <ul className="list compact">
                <li>Projects missing workspaceId: {overview.missingWorkspaceIdProjects}</li>
                <li>Teams missing workspaceId: {overview.missingWorkspaceIdTeams}</li>
                <li>Roles missing workspaceId: {overview.missingWorkspaceIdRoles}</li>
                <li>Members missing workspaceId: {overview.missingWorkspaceIdMembers}</li>
                <li>Invites missing workspaceId: {overview.missingWorkspaceIdInvites}</li>
                <li>Join requests missing workspaceId: {overview.missingWorkspaceIdJoinRequests}</li>
                <li>Audit events missing workspaceId: {overview.missingWorkspaceIdAuditEvents}</li>
              </ul>
            </div>
          ) : null}

          {active === 'Workspaces' ? (
            <div className="card">
              <h3>All workspaces</h3>
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Workspace</th>
                      <th>Members</th>
                      <th>Teams</th>
                      <th>Roles</th>
                      <th>Projects</th>
                      <th>Invites</th>
                      <th>Pending</th>
                      <th>Last audit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaces.length === 0 ? (
                      <tr><td colSpan={8} className="muted">No workspaces.</td></tr>
                    ) : (
                      workspaces.map((ws) => (
                        <tr key={ws.id}>
                          <td>{ws.name} ({ws.slug}){ws.demo ? ' [DEMO]' : ''}</td>
                          <td>{ws.members}</td>
                          <td>{ws.teams}</td>
                          <td>{ws.roles}</td>
                          <td>{ws.projects}</td>
                          <td>{ws.invites}</td>
                          <td>{ws.pendingJoinRequests}</td>
                          <td>{ws.lastAuditAt ? new Date(ws.lastAuditAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {active === 'Users' ? (
            <div className="card">
              <h3>All users</h3>
              <div className="row">
                <input
                  value={userQuery}
                  onChange={(event) => setUserQuery(event.target.value)}
                  placeholder="Search user (name/email)"
                />
                <button type="button" className="btn btn-secondary" onClick={() => void refreshUsers()}>
                  Search
                </button>
              </div>
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Admin</th>
                      <th>Email verified</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr><td colSpan={5} className="muted">No users.</td></tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.displayName || '-'}</td>
                          <td>{user.email || '-'}</td>
                          <td>{user.admin ? 'Yes' : 'No'}</td>
                          <td>{user.emailVerified ? 'Yes' : 'No'}</td>
                          <td>{user.createdAt ? new Date(user.createdAt).toLocaleString() : '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {active === 'Audit log' ? (
            <div className="card">
              <h3>Global audit log</h3>
              <div className="audit-toolbar">
                <input value={auditWorkspaceId} onChange={(event) => setAuditWorkspaceId(event.target.value)} placeholder="Workspace ID" />
                <input value={auditActorUserId} onChange={(event) => setAuditActorUserId(event.target.value)} placeholder="Actor user ID" />
                <select value={auditCategory} onChange={(event) => setAuditCategory(event.target.value)}>
                  {AUDIT_CATEGORIES.map((category) => (
                    <option key={category || 'all'} value={category}>
                      {category || 'All categories'}
                    </option>
                  ))}
                </select>
                <input value={auditQ} onChange={(event) => setAuditQ(event.target.value)} placeholder="Search message/entity" />
                <button type="button" className="btn btn-secondary" onClick={() => void refreshAudit()}>
                  Filter
                </button>
              </div>
              <div className="audit-table-wrap">
                <table className="audit-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Workspace</th>
                      <th>Category</th>
                      <th>Action</th>
                      <th>Outcome</th>
                      <th>Actor</th>
                      <th>Entity</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.length === 0 ? (
                      <tr><td colSpan={8} className="muted">No audit events.</td></tr>
                    ) : (
                      auditRows.map((row) => (
                        <tr key={row.id}>
                          <td>{new Date(row.createdAt).toLocaleString()}</td>
                          <td>{row.workspaceId}</td>
                          <td>{row.category}</td>
                          <td>{row.action}</td>
                          <td>{row.outcome}</td>
                          <td>{row.actorName || row.actorUserId}</td>
                          <td>{row.entityName || row.entityType || '-'}</td>
                          <td>{row.message || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

