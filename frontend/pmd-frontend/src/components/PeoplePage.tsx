import { useEffect, useMemo, useState } from 'react'
import type {
  PeopleOverviewStatsResponse,
  PeopleUserStatsResponse,
  Project,
  UserSummary,
} from '../types'
import { ControlsBar } from './common/ControlsBar'
import { PmdLoader } from './common/PmdLoader'
import { fetchPeopleOverviewStats, fetchPeopleUserStats } from '../api/stats'
import { isApiError } from '../api/http'

type PeoplePageProps = {
  users: UserSummary[]
  projects: Project[]
}

const MAX_PROJECT_TITLE_LENGTH = 32
const STATUS_COLORS = ['#60a5fa', '#f59e0b', '#22c55e', '#ef4444', '#64748b']
const ACTIVITY_COLORS = ['#22c55e', '#64748b']

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '…'
    : value
}

export function PeoplePage({ users, projects }: PeoplePageProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])
  const [overviewStats, setOverviewStats] = useState<PeopleOverviewStatsResponse | null>(null)
  const [selectedUserStats, setSelectedUserStats] = useState<PeopleUserStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [
    users,
    selectedUserId,
  ])

  const selectedStatusSlices = useMemo(() => {
    const slices = selectedUserStats?.pies?.projectsByStatus ?? []
    return slices.map((slice, index) => ({
      label: slice.label,
      value: slice.value ?? 0,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }))
  }, [selectedUserStats])

  const selectedActivitySlices = useMemo(() => {
    const slices = selectedUserStats?.pies?.activeInactive ?? []
    return slices.map((slice, index) => ({
      label: slice.label,
      value: slice.value ?? 0,
      color: ACTIVITY_COLORS[index % ACTIVITY_COLORS.length],
    }))
  }, [selectedUserStats])

  const overviewPeopleSlices = useMemo(() => {
    const slices = overviewStats?.pies?.peopleByTeam ?? []
    return slices.map((slice, index) => ({
      label: slice.label,
      value: slice.value ?? 0,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
    }))
  }, [overviewStats])

  const overviewWorkloadSlices = useMemo(() => {
    const slices = overviewStats?.pies?.workloadByTeam ?? []
    return slices.map((slice, index) => ({
      label: slice.label,
      value: slice.value ?? 0,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
    }))
  }, [overviewStats])

  const availableTeams = useMemo(() => {
    const set = new Set<string>()
    users.forEach((user) => {
      const team = user.team ?? 'Team'
      if (team.toLowerCase() !== 'admin') {
        set.add(team)
      }
    })
    return Array.from(set).sort()
  }, [users])

  useEffect(() => {
    if (availableTeams.length === 0) {
      setSelectedTeams([])
      return
    }
    setSelectedTeams((prev) => {
      const next = prev.filter((team) => availableTeams.includes(team))
      return next.length ? next : [...availableTeams]
    })
  }, [availableTeams])

  useEffect(() => {
    let active = true
    fetchPeopleOverviewStats()
      .then((data) => {
        if (active) setOverviewStats(data)
      })
      .catch((err) => {
        if (active) {
          if (isApiError(err)) {
            console.error('People overview stats failed', err.status, err.data ?? err.message)
          } else {
            console.error('People overview stats failed', err)
          }
          setStatsError(err instanceof Error ? err.message : 'Failed to load stats')
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserStats(null)
      setStatsError(null)
      return
    }
    let active = true
    setStatsLoading(true)
    setStatsError(null)
    fetchPeopleUserStats(selectedUserId)
      .then((data) => {
        if (active) setSelectedUserStats(data)
      })
      .catch((err) => {
        if (active) {
          if (isApiError(err)) {
            console.error('People user stats failed', err.status, err.data ?? err.message)
          } else {
            console.error('People user stats failed', err)
          }
          setStatsError(err instanceof Error ? err.message : 'Failed to load stats')
        }
      })
      .finally(() => {
        if (active) setStatsLoading(false)
      })
    return () => {
      active = false
    }
  }, [selectedUserId])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = users.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const team = user.team?.toLowerCase() ?? ''
      if (team === 'admin') {
        return false
      }
      const matchesQuery = !query || name.includes(query) || email.includes(query) || team.includes(query)
      const matchesTeam =
        selectedTeams.length === 0 || selectedTeams.includes(user.team ?? 'Team')
      return matchesQuery && matchesTeam
    })
    return [...filtered].sort((a, b) => {
      const nameA = a.displayName ?? ''
      const nameB = b.displayName ?? ''
      return nameA.localeCompare(nameB)
    })
  }, [users, search, selectedTeams])

  const assignedProjects = useMemo(() => {
    if (!selectedUserId) return []
    return projects.filter((project) => (project.memberIds ?? []).includes(selectedUserId))
  }, [projects, selectedUserId])

  const groupedProjects = useMemo(() => {
    const groups: Record<string, Project[]> = {
      NOT_STARTED: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      CANCELED: [],
    }
    assignedProjects.forEach((project) => {
      const key = project.status ?? 'NOT_STARTED'
      if (groups[key]) {
        groups[key].push(project)
      } else {
        groups.NOT_STARTED.push(project)
      }
    })
    return groups
  }, [assignedProjects])

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>People</h2>
        </div>
      </div>
      <div className="dashboard-controls">
        <ControlsBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search people"
          filters={availableTeams.map((team) => ({ key: team, label: team }))}
          selectedFilterKeys={selectedTeams}
          onSelectedFilterKeysChange={setSelectedTeams}
          searchAriaLabel="Search people"
          filterAriaLabel="Filter teams"
          searchOverlay
        />
      </div>
      <div className="people-layout">
        <div className="card">
          <h3>Directory</h3>
          <div className="people-grid people-directory">
            {filteredUsers.length === 0 ? <div className="muted">No users found.</div> : null}
            {filteredUsers.map((user) => (
              <button
                key={user.id ?? user.email ?? Math.random()}
                type="button"
                className={`card people-card motion-card${selectedUserId === user.id ? ' selected project-row' : ''}`}
                onClick={() => {
                  const id = user.id ?? null
                  setSelectedUserId((prev) => (prev === id ? null : id))
                }}
                title={user.email ?? user.displayName ?? ''}
                aria-pressed={selectedUserId === user.id}
              >
                <strong className="truncate" title={user.displayName ?? ''}>
                  {user.displayName ?? '-'}
                </strong>
                <span className="muted truncate" title={user.team ?? 'Team'}>
                  {user.team ?? 'Team'}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="details-content" key={selectedUser?.id ?? 'empty'}>
            {selectedUser ? (
              <>
              <div className="panel-header">
                <div>
                  <h3 className="truncate" title={selectedUser.displayName ?? ''}>
                    {selectedUser.displayName ?? '-'}
                  </h3>
                  <div className="muted truncate" title={selectedUser.email ?? ''}>
                    {selectedUser.email ?? ''}
                  </div>
                  <div className="muted truncate" title={selectedUser.team ?? 'Team'}>
                    {selectedUser.team ?? 'Team'}
                  </div>
                </div>
              </div>
              {statsError ? <p className="error">Failed to load stats.</p> : null}
              {statsLoading ? (
                <PmdLoader size="sm" variant="panel" />
              ) : statsError ? null : (
                <div className="people-stats">
                  <div className="card stats-card">
                    <h4>Projects by status</h4>
                    <PieChart data={selectedStatusSlices} />
                  </div>
                  <div className="card stats-card">
                    <h4>Active vs inactive</h4>
                    <PieChart data={selectedActivitySlices} />
                  </div>
                </div>
              )}
              <h4>Assigned projects</h4>
              <div className="people-projects">
                {assignedProjects.length === 0 ? (
                  <p className="muted">No projects assigned yet.</p>
                ) : (
                  (['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] as const).map((status) => {
                    const projectsForStatus = groupedProjects[status]
                    if (!projectsForStatus || projectsForStatus.length === 0) {
                      return null
                    }
                    return (
                      <div key={status} className="people-project-group">
                        <div className="dashboard-folder-header">
                          <h3>{status.replace('_', ' ')}</h3>
                          <span className="folder-count">{projectsForStatus.length}</span>
                        </div>
                        <div className="people-project-grid">
                          {projectsForStatus.map((project) => (
                            <div key={project.id ?? project.name ?? Math.random()} className="card project-preview">
                              <div className="row space">
                                <strong className="truncate" title={project.name ?? ''}>
                                  {formatProjectTitle(project.name)}
                                </strong>
                                <span className={`status-badge status-${project.status ?? 'NOT_STARTED'}`}>
                                  {(project.status ?? 'NOT_STARTED').toString().replace('_', ' ')}
                                </span>
                              </div>
                              <p className="muted clamp-2" title={project.description ?? ''}>
                                {project.description ?? 'No description.'}
                              </p>
                              <span className="muted">Members: {(project.memberIds ?? []).length}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              </>
            ) : (
              <div className="people-empty">
              <div className="panel-header">
                <div>
                  <h3>Overview</h3>
                  <p className="muted">Select a person to view assigned projects.</p>
                </div>
              </div>
              {statsError ? <p className="error">Failed to load stats.</p> : null}
              {statsError ? null : (
                <div className="people-stats">
                  <div className="card stats-card">
                    <h4>People per team</h4>
                    <PieChart data={overviewPeopleSlices} />
                  </div>
                  <div className="card stats-card">
                    <h4>Active assignments by team</h4>
                    <PieChart data={overviewWorkloadSlices} />
                  </div>
                </div>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

const TEAM_COLORS = ['#a855f7', '#38bdf8', '#f97316', '#22c55e', '#facc15', '#e879f9']

type PieSlice = {
  label: string
  value: number
  color: string
}

function PieChart({ data }: { data: PieSlice[] }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return <p className="muted">No data available.</p>
  }
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="pie-chart">
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} stroke="var(--border)" strokeWidth="14" fill="none" />
        {data.map((slice, index) => {
          if (slice.value === 0) return null
          const dash = (slice.value / total) * circumference
          const dashArray = `${dash} ${circumference - dash}`
          const dashOffset = circumference - offset
          offset += dash
          return (
            <circle
              key={`${slice.label}-${index}`}
              cx="60"
              cy="60"
              r={radius}
              stroke={slice.color}
              strokeWidth="14"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              fill="none"
              transform="rotate(-90 60 60)"
            />
          )
        })}
      </svg>
      <div className="pie-legend">
        {data.map((slice) => (
          <div key={slice.label} className="legend-item">
            <span className="legend-dot" style={{ background: slice.color }} />
            <span className="truncate" title={slice.label}>
              {slice.label}
            </span>
            <span className="muted">{slice.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
