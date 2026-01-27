import { useEffect, useMemo, useState } from 'react'
import type { CreateProjectPayload, Project, ProjectStatus, UserSummary } from '../types'
import { updateProject } from '../api/projects'
import { ControlsBar } from './common/ControlsBar'
import { isApiError } from '../api/http'

type AssignPageProps = {
  projects: Project[]
  users: UserSummary[]
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onClearSelection?: () => void
  onRefresh?: () => void
}

const MAX_PROJECT_TITLE_LENGTH = 32

type ProjectFolderKey =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED'
  | 'ARCHIVED'

const FOLDERS: { key: ProjectFolderKey; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELED', label: 'Canceled' },
  { key: 'ARCHIVED', label: 'Archived' },
]

function toFolderKey(status?: string | null): ProjectFolderKey {
  if (!status) return 'NOT_STARTED'
  if (status === 'ARCHIVED') return 'ARCHIVED'
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELED') return 'CANCELED'
  return 'NOT_STARTED'
}

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '...'
    : value
}

export function AssignPage({
  projects,
  users,
  selectedProjectId,
  onSelectProject,
  onClearSelection,
  onRefresh,
}: AssignPageProps) {
  const [selectedMembers, setSelectedMembers] = useState<UserSummary[]>([])
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [draggingUserId, setDraggingUserId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])

  const usersById = useMemo(() => {
    const map = new Map<string, UserSummary>()
    users.forEach((user) => {
      if (user.id) {
        map.set(user.id, user)
      }
    })
    return map
  }, [users])

  const teamByUserId = useMemo(() => {
    const map = new Map<string, string>()
    users.forEach((user) => {
      if (user.id && user.team) {
        map.set(user.id, user.team)
      }
    })
    return map
  }, [users])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  )
  const hasSelectedProject = Boolean(selectedProject && selectedProject.id)

  useEffect(() => {
    if (!selectedProject) {
      setSelectedMembers([])
      return
    }
    const ids = selectedProject.memberIds ?? []
    const mapped = ids.map((id) => usersById.get(id) ?? { id, displayName: 'Unknown user' })
    setSelectedMembers(mapped)
  }, [selectedProject, usersById])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const teams = useMemo(() => {
    const values = new Set<string>()
    users.forEach((user) => {
      if (user.team) values.add(user.team)
    })
    return Array.from(values).sort()
  }, [users])

  const availableTeams = useMemo(() => {
    return teams
  }, [teams])

  useEffect(() => {
    if (selectedFilters.length > 0) {
      return
    }
    const allStatuses = FOLDERS.map((folder) => `status:${folder.key}`)
    const allTeams = availableTeams.map((team) => `team:${team}`)
    setSelectedFilters([...allStatuses, ...allTeams])
  }, [availableTeams, selectedFilters.length])

  const selectedStatusSet = useMemo(() => {
    return new Set(
      selectedFilters
        .filter((value) => value.startsWith('status:'))
        .map((value) => value.replace('status:', ''))
    )
  }, [selectedFilters])

  const selectedTeamSet = useMemo(() => {
    return new Set(
      selectedFilters
        .filter((value) => value.startsWith('team:'))
        .map((value) => value.replace('team:', ''))
        .filter(Boolean)
    )
  }, [selectedFilters])

  const projectMatchesTeamFilter = (project: Project) => {
    if (selectedTeamSet.size === 0) {
      return availableTeams.length === 0
    }
    const memberIds = project.memberIds ?? []
    return memberIds.some((id) => {
      const team = teamByUserId.get(id ?? '')
      return team ? selectedTeamSet.has(team) : false
    })
  }

  const scopedProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    return projects.filter((project) => {
      const statusKey = project.status ?? 'NOT_STARTED'
      if (selectedStatusSet.size === 0) {
        return false
      }
      if (!selectedStatusSet.has(statusKey)) {
        return false
      }
      if (!projectMatchesTeamFilter(project)) {
        return false
      }
      if (query) {
        return (project.name ?? '').toLowerCase().includes(query)
      }
      return true
    })
  }, [projects, selectedStatusSet, selectedTeamSet, teamByUserId, projectSearch, availableTeams])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const team = user.team ?? ''
      const matchesQuery = !query || name.includes(query) || email.includes(query)
      const matchesTeam = !teamFilter || team === teamFilter
      return matchesQuery && matchesTeam && team.toLowerCase() !== 'admin'
    })
  }, [users, search, teamFilter])

  const handleAddMember = (user: UserSummary) => {
    if (!hasSelectedProject) return
    if (!user.id) return
    setSelectedMembers((prev) => {
      if (prev.some((member) => member.id === user.id)) return prev
      return [...prev, user]
    })
  }

  const handleRemoveMember = (id?: string | null) => {
    if (!id) return
    setSelectedMembers((prev) => prev.filter((member) => member.id !== id))
  }

  const handleDragStart = (event: React.DragEvent, userId?: string | null) => {
    if (!userId) return
    setDraggingUserId(userId)
    event.dataTransfer.setData('text/plain', userId)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleDragEnd = () => {
    setDraggingUserId(null)
  }

  const handleDropMember: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setDragOver(false)
    if (!hasSelectedProject) return
    const userId = event.dataTransfer.getData('text/plain')
    if (!userId) return
    const user = usersById.get(userId)
    if (user) handleAddMember(user)
  }

  const handleSave = async () => {
    if (!selectedProject || !selectedProject.id) return
    setError(null)
    const memberIds = selectedMembers.map((member) => member.id).filter(Boolean) as string[]
    const payload: CreateProjectPayload = {
      name: (selectedProject.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: selectedProject.description ?? undefined,
      status: (selectedProject.status ?? 'NOT_STARTED') as ProjectStatus,
      memberIds,
    }
    try {
      setSaving(true)
      await updateProject(selectedProject.id, payload)
      setToast('Saved')
    } catch (err) {
      if (isApiError(err) && (err.status === 403 || err.status === 404)) {
        if (err.status === 404 && onClearSelection) {
          onClearSelection()
        }
        setError(err.status === 403 ? 'Not allowed' : 'Project not found.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: ProjectStatus) => {
    if (!selectedProject || !selectedProject.id) return
    setError(null)
    const payload: CreateProjectPayload = {
      name: (selectedProject.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: selectedProject.description ?? undefined,
      status,
      memberIds: selectedMembers.map((member) => member.id).filter(Boolean) as string[],
    }
    try {
      setStatusUpdating(true)
      await updateProject(selectedProject.id, payload)
      setToast('Status updated')
      await onRefresh?.()
    } catch (err) {
      if (isApiError(err) && (err.status === 403 || err.status === 404)) {
        if (err.status === 404 && onClearSelection) {
          onClearSelection()
        }
        setError(err.status === 403 ? 'Not allowed' : 'Project not found.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setStatusUpdating(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Assign</h2>
        </div>
      </div>
      <div className="assign-layout">
        <div className="card assign-panel assign-panel-projects">
          <div className="panel-header">
            <h3>Projects</h3>
            <span className="muted">{projects.length} total</span>
          </div>
          <div className="dashboard-controls">
            <ControlsBar
              searchValue={projectSearch}
              onSearchChange={setProjectSearch}
              searchPlaceholder="Search projects"
              filters={[]}
              filterSections={[
                {
                  label: 'Statuses',
                  options: FOLDERS.map((folder) => ({
                    id: `status:${folder.key}`,
                    label: folder.label,
                  })),
                },
                {
                  label: 'Teams',
                  options: availableTeams.map((team) => ({
                    id: `team:${team}`,
                    label: team,
                  })),
                },
              ]}
              selectedFilterKeys={selectedFilters}
              onSelectedFilterKeysChange={setSelectedFilters}
              searchAriaLabel="Search projects"
              filterAriaLabel="Filter"
            />
          </div>
          <div className="assign-panel-body assign-folders">
            {FOLDERS.filter((folder) => selectedStatusSet.has(folder.key)).map((folder) => {
              const filteredProjects = scopedProjects
                .filter((project) => toFolderKey(project.status ?? 'NOT_STARTED') === folder.key)
              if (filteredProjects.length === 0) {
                return null
              }
              return (
                <div key={folder.key} className="dashboard-folder">
                  <div className="dashboard-folder-header">
                    <h3>{folder.label}</h3>
                    <span className="folder-count">{filteredProjects.length}</span>
                  </div>
                  <div className="project-grid">
                    {filteredProjects.map((project) => {
                      const id = project.id ?? ''
                      const memberCount = project.memberIds?.length ?? 0
                      const isSelected = selectedProjectId === id
                      return (
                        <button
                          key={id || project.name || Math.random()}
                          type="button"
                          className={`card project-card motion-card${isSelected ? ' is-selected' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              onClearSelection?.()
                              return
                            }
                            onSelectProject(id)
                          }}
                          title={project.name ?? ''}
                          aria-pressed={isSelected}
                        >
                          <strong className="truncate">{formatProjectTitle(project.name)}</strong>
                          <div className="meta">
                            <span className={`status-badge status-${project.status ?? 'NOT_STARTED'}`}>
                              {(project.status ?? 'NOT_STARTED').toString().replace('_', ' ')}
                            </span>
                            <span className="muted">Members: {memberCount}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="card assign-panel assign-panel-people">
          <div className="panel-header">
            <h3>Available people</h3>
          </div>
          <div className="member-filters">
            <input
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
          <div className="assign-panel-body">
            <div className="people-grid">
              {filteredUsers.length === 0 ? (
                <div className="muted">No users match the filters.</div>
              ) : (
                filteredUsers.map((user) => {
                  const alreadyAdded = selectedMembers.some((member) => member.id === user.id)
                  const activeCount = user.activeProjectCount ?? 0
                  return (
                    <div
                      key={user.id ?? user.email ?? Math.random()}
                      className={`card people-card motion-card draggable${alreadyAdded ? ' is-selected' : ''}${draggingUserId === user.id ? ' is-dragging' : ''}`}
                      title={`Active projects: ${activeCount}`}
                      draggable={!alreadyAdded && hasSelectedProject}
                      onDragStart={(event) => handleDragStart(event, user.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="people-card-main">
                        <strong className="truncate" title={user.displayName ?? ''}>
                          {user.displayName ?? '-'}
                        </strong>
                        <span className="muted truncate" title={user.email ?? ''}>
                          {user.email ?? ''}
                        </span>
                        <span className="muted truncate" title={user.team ?? 'Team'}>
                          {user.team ?? 'Team'}
                        </span>
                      </div>
                      <div className="people-card-actions">
                        <span className="people-card-handle" aria-hidden="true">
                          ::
                        </span>
                        <button
                          type="button"
                          className="btn btn-icon btn-ghost people-card-add"
                          aria-label={`Add ${user.displayName ?? 'person'} to project`}
                          title="Add"
                          data-tooltip="Add"
                          onMouseDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleAddMember(user)
                          }}
                          disabled={alreadyAdded || !hasSelectedProject}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
        <div className="card assign-panel assign-panel-assigned">
          <div className="panel-header">
            <h3 className="truncate" title={selectedProject?.name ?? ''}>
              {selectedProject
                ? `Assigned to ${formatProjectTitle(selectedProject.name)}`
                : 'Assigned people'}
            </h3>
            <span className="muted">{selectedMembers.length} people</span>
          </div>
          {selectedProject ? (
            <div className="row">
              <label className="muted">Status</label>
              <select
                className="status-select"
                value={selectedProject.status ?? 'NOT_STARTED'}
                onChange={(event) => handleStatusChange(event.target.value as ProjectStatus)}
                disabled={statusUpdating}
              >
                {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] as ProjectStatus[]).map((value) => (
                  <option key={value} value={value}>
                    {value.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {toast ? <div className="banner info">{toast}</div> : null}
          <div className="assign-panel-body">
            <div
              className={`member-dropzone${dragOver ? ' is-over' : ''}${
                hasSelectedProject ? '' : ' is-disabled'
              }`}
              onDragEnter={(event) => {
                if (!hasSelectedProject) return
                event.preventDefault()
                setDragOver(true)
              }}
              onDragOver={(event) => {
                if (!hasSelectedProject) return
                event.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDropMember}
            >
              {!hasSelectedProject ? (
                <p className="muted">Select a project to start assigning people.</p>
              ) : selectedMembers.length === 0 ? (
                <p className="muted">Drop people here or click add.</p>
              ) : (
                <div className="member-chips">
                  {selectedMembers.map((member) => (
                    <span
                      key={member.id ?? member.email ?? Math.random()}
                      className="chip"
                      draggable
                      onDragStart={(event) => handleDragStart(event, member.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <strong className="chip-name" title={member.email ?? ''}>
                        <span
                          className="truncate"
                          title={`${member.displayName ?? ''}${member.email ? ` - ${member.email}` : ''}`}
                        >
                          {member.displayName ?? '-'}
                        </span>
                      </strong>
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() => handleRemoveMember(member.id)}
                        aria-label={`Remove ${member.displayName ?? 'member'}`}
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="assign-bar">
            <div className="assign-bar-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !hasSelectedProject}
              >
                {saving ? 'Saving...' : 'Save assignments'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

