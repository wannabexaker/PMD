import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CreateProjectPayload, Project, UserSummary } from '../types'
import { fetchProject, updateProject } from '../api/projects'
import { useAuth } from '../auth/authUtils'
import { ProjectComments } from './ProjectComments'
import { PmdLoader } from './common/PmdLoader'

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString()
}

type ProjectDetailsProps = {
  projectId: string | null
  users: UserSummary[]
}

const MAX_PROJECT_TITLE_LENGTH = 32

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '?'
    : value
}

export function ProjectDetails({ projectId, users }: ProjectDetailsProps) {
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<UserSummary[]>([])
  const [highlightIndex, setHighlightIndex] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [updatingMembers, setUpdatingMembers] = useState(false)
  const { user } = useAuth()

  const usersById = useMemo(() => {
    const map = new Map<string, UserSummary>()
    users.forEach((user) => {
      if (user.id) {
        map.set(user.id, user)
      }
    })
    return map
  }, [users])

  const teams = useMemo(() => {
    const values = new Set<string>()
    users.forEach((user) => {
      if (user.team) {
        values.add(user.team)
      }
    })
    return Array.from(values).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const team = user.team ?? ''
      const matchesQuery = !query || name.includes(query) || email.includes(query)
      const matchesTeam = !teamFilter || team === teamFilter
      return matchesQuery && matchesTeam
    })
  }, [users, search, teamFilter])

  const initializeSelected = useCallback((currentProject: Project) => {
    const ids = currentProject.memberIds ?? []
    const mapped = ids.map((id) => usersById.get(id)).filter(Boolean) as UserSummary[]
    setSelectedMembers(mapped)
  }, [usersById])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      return
    }

    let active = true
    setLoading(true)
    setError(null)
    setNotFound(false)

    fetchProject(projectId)
      .then((data) => {
        if (!active) return
        if (!data) {
          setProject(null)
          setNotFound(true)
          return
        }
        setProject(data)
        initializeSelected(data)
      })
      .catch((err) => {
        if (!active) return
        if (err && typeof err === 'object' && 'status' in err && (err as { status?: number }).status === 404) {
          setNotFound(true)
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load project')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [projectId, initializeSelected])

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const updateMembers = async (memberIds: string[], message: string) => {
    if (!project || !project.id) {
      return
    }
    setActionError(null)
    const previous = project.memberIds ?? []
    setProject({ ...project, memberIds })
    try {
      setUpdatingMembers(true)
      const payload: CreateProjectPayload = {
        name: (project.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
        description: project.description ?? undefined,
        status: (project.status ?? 'NOT_STARTED') as CreateProjectPayload['status'],
        memberIds,
      }
      const updated = await updateProject(project.id, payload)
      setProject(updated)
      setToast(message)
    } catch (err) {
      setProject({ ...project, memberIds: previous })
      setActionError(err instanceof Error ? err.message : 'Failed to update members')
    } finally {
      setUpdatingMembers(false)
    }
  }

  const handleAddMember = (user: UserSummary) => {
    if (!user.id) {
      return
    }
    setSelectedMembers((prev) => {
      if (prev.some((member) => member.id === user.id)) {
        return prev
      }
      return [...prev, user]
    })
  }

  const handleRemoveMember = (id?: string | null) => {
    if (!id) {
      return
    }
    setSelectedMembers((prev) => prev.filter((member) => member.id !== id))
  }

  const handleSaveMembers = async () => {
    if (!project) {
      return
    }
    const memberIds = selectedMembers.map((member) => member.id).filter(Boolean) as string[]
    await updateMembers(memberIds, 'Members saved')
  }

  const handleClearSelected = () => {
    if (project) {
      initializeSelected(project)
    }
  }

  const handleResultsKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (filteredUsers.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((prev) => Math.min(prev + 1, filteredUsers.length - 1))
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((prev) => Math.max(prev - 1, 0))
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const user = filteredUsers[highlightIndex]
      if (user) {
        handleAddMember(user)
      }
    }
  }

  const handleDragStart = (event: React.DragEvent, userId?: string | null) => {
    if (!userId) {
      return
    }
    event.dataTransfer.setData('text/plain', userId)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const handleDropMember: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    setDragOver(false)
    const userId = event.dataTransfer.getData('text/plain')
    if (!userId) {
      return
    }
    const user = usersById.get(userId)
    if (user) {
      handleAddMember(user)
    }
  }

  if (!projectId) {
    return (
      <section className="panel">
        <h2>Project Details</h2>
        <p className="muted">Select a project to view details.</p>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Project Details</h2>
      {loading ? <PmdLoader size="sm" variant="panel" /> : null}
      {notFound ? <p className="muted">Project not found.</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {actionError ? <p className="error">{actionError}</p> : null}
      {toast ? <div className="banner info">{toast}</div> : null}
      {project && !notFound ? (
        <>
          <div className="card">
            <h3 className="truncate" title={project.name ?? ''}>
              {formatProjectTitle(project.name)}
            </h3>
            <p className="muted truncate" title={project.description ?? ''}>
              {project.description ?? ''}
            </p>
            <div className="meta">
              <span>Status: {(project.status ?? 'NOT_STARTED').toString().replace('_', ' ')}</span>
              <span>Created: {formatDate(project.createdAt)}</span>
              <span>Updated: {formatDate(project.updatedAt)}</span>
            </div>
            <div>
              <strong>Members</strong>
              <ul className="list compact">
                {(project.memberIds ?? []).length === 0 ? (
                  <li className="muted">No members assigned.</li>
                ) : (
                  (project.memberIds ?? []).map((memberId) => {
                    const person = usersById.get(memberId)
                    return (
                      <li key={memberId}>
                        <span className="truncate" title={person?.displayName ?? 'Unknown user'}>
                          {person ? (person.displayName ?? 'Unknown user') : 'Unknown user'}
                        </span>
                        <span className="muted truncate" title={person?.email ?? ''}>
                          {person?.email ?? ''}
                        </span>
                      </li>
                    )
                  })
                )}
              </ul>
            </div>
          </div>
            <div className="card members-panel">
              <div className="panel-header">
                <h3 className="truncate" title={project.name ?? ''}>
                  Members ? {formatProjectTitle(project.name)}
                </h3>
                <span className="muted">{selectedMembers.length} selected</span>
              </div>
            <div className="members-columns">
              <div className="members-available">
                <h4>Available people</h4>
                <div className="member-filters">
                  <input
                    type="search"
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setHighlightIndex(0)
                    }}
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
                <div className="member-results" onKeyDown={handleResultsKeyDown} tabIndex={0}>
                  {filteredUsers.length === 0 ? (
                    <p className="muted">No users match the filters.</p>
                  ) : (
                    filteredUsers.map((user, index) => {
                      const alreadyAdded = selectedMembers.some((member) => member.id === user.id)
                      return (
                        <div
                          key={user.id ?? user.email ?? 'user-' + index}
                          className={`member-row draggable${index === highlightIndex ? ' highlighted' : ''}`}
                          draggable
                          onDragStart={(event) => handleDragStart(event, user.id)}
                        >
                          <div className="member-meta">
                            <strong>{user.displayName ?? '-'}</strong>
                            <span className="muted">{user.email ?? ''}</span>
                          </div>
                          <span className="team-badge">{user.team ?? 'Team'}</span>
                          {alreadyAdded ? (
                            <span className="assigned-pill">Added</span>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary"
                              onClick={() => handleAddMember(user)}
                            >
                              Add
                            </button>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
              <div className="members-assigned">
                <h4>Assigned</h4>
                <div
                  className={`member-dropzone${dragOver ? ' is-over' : ''}`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragOver(true)
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDropMember}
                >
                  {selectedMembers.length === 0 ? (
                    <p className="muted">Drop people here or click Add.</p>
                  ) : (
                    <div className="member-chips">
                      {selectedMembers.map((member, index) => (
                        <span
                          key={member.id ?? member.email ?? 'member-' + index}
                          className="chip"
                          draggable
                          onDragStart={(event) => handleDragStart(event, member.id)}
                        >
                          <strong>{member.displayName ?? '-'}</strong>
                          <span className="muted">{member.email ?? ''}</span>
                          <button
                            type="button"
                            className="chip-remove"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            ?
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="assign-bar">
                  <div className="assign-bar-actions">
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSaveMembers}
                      disabled={updatingMembers}
                    >
                      {updatingMembers ? 'Saving...' : 'Save project'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={handleClearSelected}>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {project.id && user ? <ProjectComments projectId={project.id} currentUser={user} /> : null}
        </>
      ) : null}
    </section>
  )
}


