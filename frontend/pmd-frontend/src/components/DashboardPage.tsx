import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CreateProjectPayload, Project, ProjectStatus, User, UserSummary } from '../types'
import { CreateProjectForm } from './CreateProjectForm'
import { deleteProject, updateProject } from '../api/projects'
import { ControlsBar } from './common/ControlsBar'
import { PieChart } from './common/PieChart'
import { ProjectComments } from './ProjectComments'
import { isApiError } from '../api/http'
import {
  UNASSIGNED_FILTER_KEY,
  PROJECT_FOLDERS,
  PROJECT_STATUS_FLOW,
  PROJECT_STATUS_SELECTABLE,
  formatStatusLabel,
  toFolderKey,
} from '../projects/statuses'

type DashboardPageProps = {
  projects: Project[]
  users: UserSummary[]
  currentUser: User | null
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onClearSelection: () => void
  onCreated: (project?: Project) => void
  onRefresh: () => void
}

const MAX_PROJECT_TITLE_LENGTH = 32
const STATUS_COLORS = ['#a855f7', '#38bdf8', '#22c55e', '#f97316', '#64748b']
const TEAM_COLORS = ['#38bdf8', '#a855f7', '#f97316', '#22c55e', '#facc15', '#e879f9']

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '...'
    : value
}

function normalizeTeam(value?: string | null) {
  if (!value) return ''
  return value.trim().toLowerCase()
}

export function DashboardPage({
  projects,
  users,
  currentUser,
  selectedProjectId,
  onSelectProject,
  onClearSelection,
  onCreated,
  onRefresh,
}: DashboardPageProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draftProject, setDraftProject] = useState<CreateProjectPayload | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [availableSearch, setAvailableSearch] = useState('')
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set())
  const [availableTeams, setAvailableTeams] = useState<string[]>([])
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const initializedTeamsRef = useRef(false)
  const currentUserId = currentUser?.id ?? ''

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
        map.set(user.id, normalizeTeam(user.team))
      }
    })
    return map
  }, [users])

  const teamLabelByKey = useMemo(() => {
    const map = new Map<string, string>()
    availableTeams.forEach((team) => {
      map.set(normalizeTeam(team), team)
    })
    return map
  }, [availableTeams])

  const selectedStatusSet = useMemo(() => {
    return new Set(
      selectedFilters
        .filter((value) => value.startsWith('status:'))
        .map((value) => value.replace('status:', ''))
    )
  }, [selectedFilters])

  const unassignedFilterActive = selectedStatusSet.has(UNASSIGNED_FILTER_KEY)

  const selectedProjectStatuses = useMemo(() => {
    return new Set(Array.from(selectedStatusSet).filter((status) => status !== UNASSIGNED_FILTER_KEY))
  }, [selectedStatusSet])

  const selectedTeamSet = useMemo(() => {
    return new Set(
      selectedFilters
        .filter((value) => value.startsWith('team:'))
        .map((value) => normalizeTeam(value.replace('team:', '')))
        .filter(Boolean)
    )
  }, [selectedFilters])

  const selectedProject =
    projects.find((project) => project.id === selectedProjectId) ?? null

  const selectedIsArchived =
    toFolderKey(selectedProject?.status ?? 'NOT_STARTED') === 'ARCHIVED'

  const projectMatchesTeamFilter = useCallback(
    (project: Project) => {
      const allTeamsSelected =
        availableTeams.length > 0 && selectedTeamSet.size === availableTeams.length
      if (availableTeams.length === 0 || selectedTeamSet.size === 0 || allTeamsSelected) {
        return true
      }
      const memberIds = project.memberIds ?? []
      return memberIds.some((id) => {
        const team = teamByUserId.get(id ?? '')
        return team ? selectedTeamSet.has(team) : false
      })
    },
    [selectedTeamSet, availableTeams, teamByUserId]
  )

  useEffect(() => {
    if (!selectedProject) {
      setDraftProject(null)
      setMemberSearch('')
      setAvailableSearch('')
      return
    }
    setDraftProject({
      name: (selectedProject.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: selectedProject.description ?? '',
      status: (selectedProject.status ?? 'NOT_STARTED') as ProjectStatus,
      memberIds: selectedProject.memberIds ?? [],
    })
    setMemberSearch('')
    setAvailableSearch('')
  }, [selectedProject])

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }
    const match = projects.find((project) => project.id === selectedProjectId)
    if (!match) {
      return
    }
    const statusKey = match.status ?? 'NOT_STARTED'
    const memberCount = (match.memberIds ?? []).length
    const statusMismatch = selectedProjectStatuses.size > 0 && !selectedProjectStatuses.has(statusKey)
    const unassignedMismatch = unassignedFilterActive && memberCount > 0
    const assignedToMeMismatch =
      assignedToMeOnly && currentUserId && !(match.memberIds ?? []).includes(currentUserId)
    if (statusMismatch || unassignedMismatch || assignedToMeMismatch || !projectMatchesTeamFilter(match)) {
      onClearSelection()
    }
  }, [
    selectedProjectId,
    projects,
    selectedProjectStatuses,
    unassignedFilterActive,
    assignedToMeOnly,
    currentUserId,
    projectMatchesTeamFilter,
    onClearSelection,
  ])

  useEffect(() => {
    const teams = users
      .map((user) => user.team)
      .filter(Boolean)
      .map((team) => team as string)
    const unique = Array.from(new Set(teams)).sort((a, b) => a.localeCompare(b))
    setAvailableTeams(unique)
    if (!initializedTeamsRef.current) {
      const allStatuses = PROJECT_FOLDERS.map((folder) => `status:${folder.key}`)
      const allTeams = unique.map((team) => `team:${team}`)
      setSelectedFilters([...allStatuses, ...allTeams])
      initializedTeamsRef.current = true
    }
  }, [users])

  const defaultFilterKeys = useMemo(() => {
    const allStatuses = [
      ...PROJECT_FOLDERS.map((folder) => `status:${folder.key}`),
      `status:${UNASSIGNED_FILTER_KEY}`,
    ]
    const allTeams = availableTeams.map((team) => `team:${team}`)
    return [...allStatuses, ...allTeams]
  }, [availableTeams])

  const isFilterActive = useMemo(() => {
    if (selectedFilters.length === 0) {
      return false
    }
    if (selectedFilters.length !== defaultFilterKeys.length) {
      return true
    }
    const selectedSet = new Set(selectedFilters)
    return defaultFilterKeys.some((key) => !selectedSet.has(key))
  }, [selectedFilters, defaultFilterKeys])

  const handleStatusChange = async (project: Project, status: ProjectStatus) => {
    if (!project.id) {
      return
    }
    setError(null)
    setUpdatingId(project.id)
    const payload: CreateProjectPayload = {
      name: (project.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: project.description ?? undefined,
      status,
      memberIds: project.memberIds ?? [],
    }
    try {
      await updateProject(project.id, payload)
      await onRefresh()
    } catch (err) {
      if (isApiError(err) && (err.status === 403 || err.status === 404)) {
        onClearSelection()
        await onRefresh()
        setError(err.status === 403 ? 'Not allowed' : 'Project not found.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    if (!openMenuId) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('[data-project-menu]')) {
        return
      }
      setOpenMenuId(null)
    }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [openMenuId])

  const buildProjectPayload = (
    project: Project,
    overrides: Partial<CreateProjectPayload> = {}
  ): CreateProjectPayload => {
    return {
      name: (project.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: project.description ?? undefined,
      status: overrides.status ?? ((project.status ?? 'NOT_STARTED') as ProjectStatus),
      memberIds: overrides.memberIds ?? (project.memberIds ?? []),
    }
  }

  const updateProjectStatus = async (project: Project, status: ProjectStatus) => {
    if (!project.id) return
    await updateProject(project.id, buildProjectPayload(project, { status }))
    await onRefresh()
  }

  const handleArchive = async (project: Project) => {
    setOpenMenuId(null)
    if (!project.id) return
    try {
      await updateProjectStatus(project, 'ARCHIVED')
      setArchivedIds((prev) => new Set(prev).add(project.id as string))
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setError('Not allowed')
      }
    }
  }

  const handleRestore = async (project: Project) => {
    setOpenMenuId(null)
    if (!project.id) return
    try {
      await updateProject(
        project.id,
        buildProjectPayload(project, { status: 'NOT_STARTED', memberIds: [] })
      )
      setArchivedIds((prev) => {
        const next = new Set(prev)
        next.delete(project.id as string)
        return next
      })
      await onRefresh()
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setError('Not allowed')
      }
    }
  }

  const handleDelete = async (project: Project) => {
    setOpenMenuId(null)
    if (!project.id) return
    const confirmed = window.confirm('Delete this project permanently?')
    if (!confirmed) return
    try {
      await deleteProject(project.id)
      setArchivedIds((prev) => {
        const next = new Set(prev)
        next.delete(project.id as string)
        return next
      })
      await onRefresh()
      if (selectedProjectId === project.id) {
        onClearSelection()
      }
    } catch (err) {
      if (isApiError(err) && err.status === 403) {
        setError('Not allowed')
      }
    }
  }

  const isDirty = useMemo(() => {
    if (!selectedProject || !draftProject) {
      return false
    }
    const originalMembers = (selectedProject.memberIds ?? []).slice().sort()
    const draftMembers = (draftProject.memberIds ?? []).slice().sort()
    return (
      selectedProject.name !== draftProject.name ||
      (selectedProject.description ?? '') !== (draftProject.description ?? '') ||
      (selectedProject.status ?? 'NOT_STARTED') !== draftProject.status ||
      originalMembers.join('|') !== draftMembers.join('|')
    )
  }, [selectedProject, draftProject])

  const handleDraftSave = async () => {
    if (!selectedProject?.id || !draftProject) {
      return
    }
    setError(null)
    setUpdatingId(selectedProject.id)
    try {
      await updateProject(selectedProject.id, {
        name: draftProject.name.trim().slice(0, MAX_PROJECT_TITLE_LENGTH),
        description: draftProject.description?.trim() || undefined,
        status: draftProject.status,
        memberIds: draftProject.memberIds ?? [],
      })
      await onRefresh()
    } catch (err) {
      if (isApiError(err) && (err.status === 403 || err.status === 404)) {
        onClearSelection()
        await onRefresh()
        setError(err.status === 403 ? 'Not allowed' : 'Project not found.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setUpdatingId(null)
    }
  }

  const assignedMembers = useMemo(() => {
    if (!draftProject) return []
    return (draftProject.memberIds ?? [])
      .map((id) => usersById.get(id))
      .filter(Boolean) as UserSummary[]
  }, [draftProject, usersById])

  const availablePeople = useMemo(() => {
    if (!draftProject) return []
    const assignedIds = new Set(draftProject.memberIds ?? [])
    return users.filter((user) => user.id && !assignedIds.has(user.id) && (user.team ?? '').toLowerCase() !== 'admin')
  }, [users, draftProject])

  const scopedProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects.filter((project) => {
      const statusKey = project.status ?? 'NOT_STARTED'
      const memberCount = (project.memberIds ?? []).length
      if (selectedProjectStatuses.size === 0 && !unassignedFilterActive) {
        return false
      }
      if (selectedProjectStatuses.size > 0 && !selectedProjectStatuses.has(statusKey)) {
        return false
      }
      if (unassignedFilterActive && memberCount > 0) {
        return false
      }
      if (assignedToMeOnly && currentUserId) {
        if (!(project.memberIds ?? []).includes(currentUserId)) {
          return false
        }
      }
      if (!projectMatchesTeamFilter(project)) {
        return false
      }
      if (query) {
        return (project.name ?? '').toLowerCase().includes(query)
      }
      return true
    })
  }, [
    projects,
    selectedProjectStatuses,
    unassignedFilterActive,
    assignedToMeOnly,
    currentUserId,
    search,
    projectMatchesTeamFilter,
  ])

  const foldersToShow = useMemo(() => {
    if (selectedProjectStatuses.size > 0) {
      return PROJECT_FOLDERS.filter((folder) => selectedProjectStatuses.has(folder.key))
    }
    return PROJECT_FOLDERS.filter((folder) =>
      scopedProjects.some((project) => toFolderKey(project.status ?? 'NOT_STARTED') === folder.key)
    )
  }, [selectedProjectStatuses, scopedProjects])

  const statusSlices = useMemo(() => {
    const counts = new Map<string, number>()
    scopedProjects.forEach((project) => {
      const status = (project.status ?? 'NOT_STARTED') as string
      counts.set(status, (counts.get(status) ?? 0) + 1)
    })
    return PROJECT_STATUS_FLOW.map((status, index) => ({
      label: formatStatusLabel(status),
      value: counts.get(status) ?? 0,
      color: STATUS_COLORS[index % STATUS_COLORS.length],
    }))
  }, [scopedProjects])

  const projectsByTeamSlices = useMemo(() => {
    const counts = new Map<string, number>()
    scopedProjects.forEach((project) => {
      const projectTeams = new Set<string>()
      ;(project.memberIds ?? []).forEach((memberId) => {
        const team = teamByUserId.get(memberId ?? '')
        if (team) {
          projectTeams.add(team)
        }
      })
      projectTeams.forEach((team) => {
        if (selectedTeamSet.size > 0 && !selectedTeamSet.has(team)) {
          return
        }
        counts.set(team, (counts.get(team) ?? 0) + 1)
      })
    })
    return Array.from(counts.entries()).map(([team, value], index) => ({
      label: teamLabelByKey.get(team) ?? team,
      value,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
    }))
  }, [scopedProjects, selectedTeamSet, teamByUserId, teamLabelByKey])

  const workloadByTeamSlices = useMemo(() => {
    const counts = new Map<string, number>()
    scopedProjects.forEach((project) => {
      const status = project.status ?? 'NOT_STARTED'
      if (status !== 'NOT_STARTED' && status !== 'IN_PROGRESS') {
        return
      }
      ;(project.memberIds ?? []).forEach((memberId) => {
        const team = teamByUserId.get(memberId ?? '')
        if (!team) {
          return
        }
        if (selectedTeamSet.size > 0 && !selectedTeamSet.has(team)) {
          return
        }
        counts.set(team, (counts.get(team) ?? 0) + 1)
      })
    })
    return Array.from(counts.entries()).map(([team, value], index) => ({
      label: teamLabelByKey.get(team) ?? team,
      value,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
    }))
  }, [scopedProjects, selectedTeamSet, teamByUserId, teamLabelByKey])

  const visibleProjects = scopedProjects

  const unassignedCount = scopedProjects.filter((project) => (project.memberIds ?? []).length === 0).length
  const assignedCount = scopedProjects.filter((project) => (project.memberIds ?? []).length > 0).length
  const inProgressCount = scopedProjects.filter(
    (project) => (project.status ?? 'NOT_STARTED') === 'IN_PROGRESS'
  ).length
  const completedCount = scopedProjects.filter(
    (project) => (project.status ?? 'NOT_STARTED') === 'COMPLETED'
  ).length
  const canceledCount = scopedProjects.filter(
    (project) => (project.status ?? 'NOT_STARTED') === 'CANCELED'
  ).length
  const archivedCount = scopedProjects.filter(
    (project) => (project.status ?? 'NOT_STARTED') === 'ARCHIVED'
  ).length

  const filteredAssigned = useMemo(() => {
    const query = memberSearch.trim().toLowerCase()
    if (!query) return assignedMembers
    return assignedMembers.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      return name.includes(query) || email.includes(query)
    })
  }, [assignedMembers, memberSearch])

  const filteredAvailable = useMemo(() => {
    const query = availableSearch.trim().toLowerCase()
    if (!query) return availablePeople
    return availablePeople.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      return name.includes(query) || email.includes(query)
    })
  }, [availablePeople, availableSearch])

  const addMember = (userId?: string | null) => {
    if (!draftProject || !userId) return
    if (draftProject.memberIds?.includes(userId)) return
    setDraftProject({
      ...draftProject,
      memberIds: [...(draftProject.memberIds ?? []), userId],
    })
  }

  const removeMember = (userId?: string | null) => {
    if (!draftProject || !userId) return
    setDraftProject({
      ...draftProject,
      memberIds: (draftProject.memberIds ?? []).filter((id) => id !== userId),
    })
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Dashboard</h2>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-icon"
          onClick={() => setShowCreate(true)}
          aria-label="Add project"
          title="Add project"
          data-tooltip="Add project"
        >
          +
        </button>
      </div>

      {error ? <p className="error">{error}</p> : null}

      {showCreate ? (
        <div className="card">
          <div className="panel-header">
            <h3>Create project</h3>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Close
            </button>
          </div>
          <CreateProjectForm
            users={users}
            currentUser={currentUser}
            onCreated={(created) => {
              setShowCreate(false)
              onCreated(created)
            }}
          />
        </div>
      ) : null}

      <div className="dashboard-split">
        <div className="dashboard-list">
          <div className="dashboard-controls">
            <ControlsBar
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search projects"
              filters={[]}
              filterSections={[
                {
                  label: 'Statuses',
                  options: [
                    ...PROJECT_FOLDERS.map((folder) => ({
                      id: `status:${folder.key}`,
                      label: folder.label,
                    })),
                    { id: `status:${UNASSIGNED_FILTER_KEY}`, label: 'Unassigned' },
                  ],
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
              onSelectedFilterKeysChange={(next) => setSelectedFilters(next)}
              searchAriaLabel="Search projects"
              filterAriaLabel="Filter"
              filterActive={isFilterActive}
              actions={
                <button
                  type="button"
                  className={`btn btn-icon btn-ghost assign-toggle${assignedToMeOnly ? ' is-active' : ''}`}
                  aria-pressed={assignedToMeOnly}
                  aria-label={assignedToMeOnly ? 'Assigned to me (On)' : 'Assigned to me'}
                  title={assignedToMeOnly ? 'Assigned to me (On)' : 'Assigned to me'}
                  data-tooltip={assignedToMeOnly ? 'Assigned to me (On)' : 'Assigned to me'}
                  onClick={() => setAssignedToMeOnly((prev) => !prev)}
                >
                  <AssignMeIcon />
                </button>
              }
            />
          </div>
          <ul className="list compact">
            {visibleProjects.length === 0 ? <li className="muted">No projects yet.</li> : null}
            {foldersToShow.map((folder) => {
              const filteredProjects = visibleProjects
                .filter((project) => {
                  const key =
                    project.id && archivedIds.has(project.id)
                      ? 'ARCHIVED'
                      : toFolderKey(project.status ?? 'NOT_STARTED')
                  return key === folder.key
                })
              if (filteredProjects.length === 0) {
                return null
              }
              return (
                <li key={folder.key} className="dashboard-folder">
                  <div className="dashboard-folder-header">
                    <h3>{folder.label}</h3>
                    <span className="folder-count">{filteredProjects.length}</span>
                  </div>
                  <ul className="list compact">
                    {filteredProjects.map((project, index) => {
                      const status = project.status ?? 'NOT_STARTED'
                      const isArchived =
                        (project.id && archivedIds.has(project.id)) ||
                        toFolderKey(status) === 'ARCHIVED'
                      const memberCount = project.memberIds?.length ?? 0
                      const isAssigned = currentUserId && (project.memberIds ?? []).includes(currentUserId)
                      const isSelected = selectedProjectId === project.id
                      return (
                        <li
                          key={project.id ?? project.name ?? 'project-' + folder.key + '-' + index}
                          className={`card project-row motion-card${isSelected ? ' selected' : ''}`}
                          onClick={() => {
                            if (!project.id) return
                            if (isSelected) {
                              onClearSelection()
                            } else {
                              onSelectProject(project.id)
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              if (!project.id) return
                              if (isSelected) {
                                onClearSelection()
                              } else {
                                onSelectProject(project.id)
                              }
                            }
                          }}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="project-row-main">
                            <div className="project-row-top">
                              <div className="project-name truncate" title={project.name ?? ''}>
                                {formatProjectTitle(project.name)}
                              </div>
                              <div className="project-row-actions" data-project-menu>
                                <span className="muted members-count">{memberCount} members</span>
                                <button
                                  type="button"
                                  className="btn btn-icon btn-ghost"
                                  aria-label="Project actions"
                                  title="Project actions"
                                  data-tooltip="Project actions"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    const projectId = project.id
                                    if (!projectId) {
                                      return
                                    }
                                    setOpenMenuId((prev) => (prev === projectId ? null : projectId))
                                  }}
                                >
                                  ⋯
                                </button>
                                {openMenuId === project.id ? (
                                  <div className="project-menu">
                                    {toFolderKey(project.status ?? 'NOT_STARTED') === 'ARCHIVED' ? (
                                      <>
                                        <button
                                          type="button"
                                          className="btn btn-secondary"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleRestore(project)
                                          }}
                                        >
                                          Restore
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-danger"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                            handleDelete(project)
                                          }}
                                        >
                                          Delete
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          handleArchive(project)
                                        }}
                                      >
                                        Archive
                                      </button>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="project-row-meta">
                              {isArchived ? (
                                <span className="muted">Archived</span>
                              ) : (
                                <select
                                  className="status-select"
                                  value={status}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    handleStatusChange(project, event.target.value as ProjectStatus)
                                  }
                                  disabled={Boolean(updatingId === project.id)}
                                >
                                  {PROJECT_STATUS_SELECTABLE.map((value) => (
                                    <option key={value} value={value}>
                                      {formatStatusLabel(value)}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            {isAssigned ? <div className="assigned-me centered">Assigned to me</div> : null}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="dashboard-details">
          <div className="card details-card">
            <div className="details-content" key={selectedProject?.id ?? 'empty'}>
              {selectedProject ? (
                <>
                <div className="details-header">
                  <div>
                    <input
                      className="details-title"
                      value={draftProject?.name ?? ''}
                      onChange={(event) =>
                        draftProject && setDraftProject({ ...draftProject, name: event.target.value })
                      }
                      title={selectedProject?.name ?? draftProject?.name ?? ''}
                      maxLength={MAX_PROJECT_TITLE_LENGTH}
                      disabled={selectedIsArchived}
                    />
                    <textarea
                      className="details-description"
                      value={draftProject?.description ?? ''}
                      onChange={(event) =>
                        draftProject && setDraftProject({ ...draftProject, description: event.target.value })
                      }
                      rows={2}
                      placeholder="Add a description"
                      disabled={selectedIsArchived}
                    />
                    {selectedProject?.createdByName || selectedProject?.createdByUserId ? (
                      <div
                        className="muted truncate"
                        title={`Created by ${
                          selectedProject.createdByName ?? selectedProject.createdByUserId ?? 'Unknown'
                        }${selectedProject.createdByTeam ? ` (${selectedProject.createdByTeam})` : ''}`}
                      >
                        Created by {selectedProject.createdByName ?? selectedProject.createdByUserId}
                      </div>
                    ) : null}
                  </div>
                  {selectedIsArchived ? (
                    <div className="actions">
                      <button type="button" className="btn btn-secondary" onClick={() => handleRestore(selectedProject)}>
                        Restore
                      </button>
                      <button type="button" className="btn btn-danger" onClick={() => handleDelete(selectedProject)}>
                        Delete
                      </button>
                    </div>
                  ) : (
                    <select
                      className="status-select"
                      value={draftProject?.status ?? 'NOT_STARTED'}
                      onChange={(event) =>
                        draftProject &&
                        setDraftProject({ ...draftProject, status: event.target.value as ProjectStatus })
                      }
                    >
                      {PROJECT_STATUS_SELECTABLE.map((value) => (
                        <option key={value} value={value}>
                          {formatStatusLabel(value)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {!selectedIsArchived ? (
                  <>
                    <div className="members-editor">
                      <div className="card">
                        <h4>Members in this project</h4>
                        <input
                          type="search"
                          placeholder="Search members"
                          value={memberSearch}
                          onChange={(event) => setMemberSearch(event.target.value)}
                        />
                        <div className="member-list">
                          {filteredAssigned.length === 0 ? (
                            <p className="muted">No members yet.</p>
                          ) : (
                            filteredAssigned.map((member, index) => (
                            <div key={member.id ?? member.email ?? 'member-' + index} className="row space">
                              <div className="member-meta">
                                <strong className="truncate" title={member.displayName ?? ''}>
                                  {member.displayName ?? '-'}
                                </strong>
                                <span className="muted truncate" title={member.email ?? ''}>
                                  {member.email ?? ''}
                                </span>
                              </div>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => removeMember(member.id)}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="card">
                        <h4>Assign people</h4>
                        <input
                          type="search"
                          placeholder="Search people"
                          value={availableSearch}
                          onChange={(event) => setAvailableSearch(event.target.value)}
                        />
                        <div className="member-list">
                          {filteredAvailable.length === 0 ? (
                            <p className="muted">No available people.</p>
                          ) : (
                            filteredAvailable.map((member, index) => (
                            <div key={member.id ?? member.email ?? 'member-' + index} className="row space">
                              <div className="member-meta">
                                <strong className="truncate" title={member.displayName ?? ''}>
                                  {member.displayName ?? '-'}
                                </strong>
                                <span className="muted truncate" title={member.email ?? ''}>
                                  {member.email ?? ''}
                                </span>
                              </div>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  onClick={() => addMember(member.id)}
                                >
                                  Add
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    {selectedProject?.id && currentUser ? (
                      <ProjectComments projectId={selectedProject.id} currentUser={currentUser} />
                    ) : null}
                    <div className="details-footer">
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                          if (isDirty) {
                            handleDraftSave()
                          } else {
                            onClearSelection()
                          }
                        }}
                        disabled={Boolean(updatingId === selectedProject.id)}
                      >
                        {isDirty ? 'Save Changes' : 'Close'}
                      </button>
                    </div>
                  </>
                ) : null}
                </>
              ) : (
                <>
                <div className="stats-strip">
                  <div className="stat">
                    <span className="muted">Unassigned</span>
                    <strong>{unassignedCount}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">Assigned</span>
                    <strong>{assignedCount}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">In progress</span>
                    <strong>{inProgressCount}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">Completed</span>
                    <strong>{completedCount}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">Canceled</span>
                    <strong>{canceledCount}</strong>
                  </div>
                  <div className="stat">
                    <span className="muted">Archived</span>
                    <strong>{archivedCount}</strong>
                  </div>
                </div>
                <div className="dashboard-user-charts">
                  <div className="card stats-card dashboard-user-chart">
                    <h4>Projects by status</h4>
                    <PieChart data={statusSlices} />
                  </div>
                  <div className="card stats-card dashboard-user-chart">
                    <h4 title="Projects with at least one member in the team">
                      Projects by team
                    </h4>
                    <PieChart data={projectsByTeamSlices} />
                  </div>
                  <div className="card stats-card dashboard-user-chart">
                    <h4 title="Active assignments for team members (Not Started + In Progress)">
                      People workload by team
                    </h4>
                    <PieChart data={workloadByTeamSlices} />
                  </div>
                </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function AssignMeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="7" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4.5 19.2c1.2-3.4 4.2-5.2 7.5-5.2s6.3 1.8 7.5 5.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
