import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CreateProjectPayload, Project, ProjectStatus, User, UserSummary } from '../types'
import { deleteProject, fetchProjects, randomAssign, randomProject, updateProject } from '../api/projects'
import { fetchRecommendationDetails, toggleRecommendation } from '../api/users'
import { ControlsBar } from './common/ControlsBar'
import { isApiError } from '../api/http'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { TeamFilterSelect } from './common/TeamFilterSelect'
import {
  PROJECT_FOLDERS,
  PROJECT_STATUS_SELECTABLE,
  formatStatusLabel,
  toFolderKey,
} from '../projects/statuses'

type AssignPageProps = {
  projects: Project[]
  users: UserSummary[]
  currentUser: User | null
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onClearSelection?: () => void
  onRefresh?: () => void
}

const MAX_PROJECT_TITLE_LENGTH = 32

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '...'
    : value
}

export function AssignPage({
  projects,
  users,
  currentUser,
  selectedProjectId,
  onSelectProject,
  onClearSelection,
  onRefresh,
}: AssignPageProps) {
  const { teams, teamById } = useTeams()
  const { activeWorkspaceId } = useWorkspace()
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
  const [randomTeamId, setRandomTeamId] = useState('')
  const [projectTeamFilterValue, setProjectTeamFilterValue] = useState('')
  const [assignedToMeProjects, setAssignedToMeProjects] = useState<Project[] | null>(null)
  const [assignedToMeLoading, setAssignedToMeLoading] = useState(false)
  const [recommendationOverrides, setRecommendationOverrides] = useState<
    Record<string, { recommendedCount: number; recommendedByMe: boolean }>
  >({})
  const [tooltipUserId, setTooltipUserId] = useState<string | null>(null)
  const [recommendersById, setRecommendersById] = useState<Record<string, UserSummary[]>>({})
  const [recommendersLoadingId, setRecommendersLoadingId] = useState<string | null>(null)
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

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!error || !error.toLowerCase().includes('recommend yourself')) {
      return
    }
    const timer = window.setTimeout(() => setError(null), 5000)
    return () => window.clearTimeout(timer)
  }, [error])

  const availableTeams = useMemo(() => {
    return teams.map((team) => team.id).filter(Boolean) as string[]
  }, [teams])

  useEffect(() => {
    if (randomTeamId && !availableTeams.includes(randomTeamId)) {
      setRandomTeamId('')
    }
  }, [randomTeamId, availableTeams])

  useEffect(() => {
    if (selectedFilters.length > 0) {
      return
    }
    const allStatuses = PROJECT_FOLDERS.map((folder) => `status:${folder.key}`)
    const allTeams = availableTeams.map((teamId) => `team:${teamId}`)
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

  useEffect(() => {
    if (selectedTeamSet.size === 1) {
      setProjectTeamFilterValue(Array.from(selectedTeamSet)[0])
    } else {
      setProjectTeamFilterValue('')
    }
  }, [selectedTeamSet])

  const recommendedOnly = selectedFilters.includes('recommended')
  const assignedToMeOnly = selectedFilters.includes('assignedToMe')

  const defaultFilterKeys = useMemo(() => {
    const allStatuses = PROJECT_FOLDERS.map((folder) => `status:${folder.key}`)
    const allTeams = availableTeams.map((teamId) => `team:${teamId}`)
    return [...allStatuses, ...allTeams]
  }, [availableTeams])

  const handleProjectTeamFilterChange = (value: string) => {
    const keep = selectedFilters.filter((key) => !key.startsWith('team:'))
    const teamFilters = value ? [`team:${value}`] : availableTeams.map((teamId) => `team:${teamId}`)
    setSelectedFilters([...keep, ...teamFilters])
  }

  const handleFilterMenuChange = (next: string[]) => {
    setSelectedFilters((prev) => {
      const teamFilters = prev.filter((key) => key.startsWith('team:'))
      const nonTeam = next.filter((key) => !key.startsWith('team:'))
      return [...nonTeam, ...teamFilters]
    })
  }

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

  const refreshAssignedToMe = useCallback(async () => {
    if (!assignedToMeOnly || !activeWorkspaceId) {
      return
    }
    setAssignedToMeLoading(true)
    try {
      const data = await fetchProjects(activeWorkspaceId, { assignedToMe: true })
      setAssignedToMeProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assigned projects')
    } finally {
      setAssignedToMeLoading(false)
    }
  }, [assignedToMeOnly, activeWorkspaceId])

  useEffect(() => {
    if (!assignedToMeOnly) {
      setAssignedToMeProjects(null)
      setAssignedToMeLoading(false)
      return
    }
    void refreshAssignedToMe()
  }, [assignedToMeOnly, refreshAssignedToMe])

  const projectsSource = assignedToMeOnly && assignedToMeProjects ? assignedToMeProjects : projects

  const selectedProject = useMemo(
    () => projectsSource.find((project) => project.id === selectedProjectId) ?? null,
    [projectsSource, selectedProjectId]
  )
  const hasSelectedProject = Boolean(selectedProject && selectedProject.id)
  const selectedIsArchived =
    toFolderKey(selectedProject?.status ?? 'NOT_STARTED') === 'ARCHIVED'
  const canAssign = hasSelectedProject && !selectedIsArchived

  useEffect(() => {
    if (!selectedProjectId) {
      return
    }
    const exists = projectsSource.some((project) => project.id === selectedProjectId)
    if (!exists) {
      onClearSelection?.()
    }
  }, [projectsSource, selectedProjectId, onClearSelection])

  useEffect(() => {
    if (!selectedProject) {
      setSelectedMembers([])
      return
    }
    const ids = selectedProject.memberIds ?? []
    const mapped = ids.map((id) => usersById.get(id) ?? { id, displayName: 'Unknown user' })
    setSelectedMembers(mapped)
  }, [selectedProject, usersById])

  const projectMatchesTeamFilter = useCallback(
    (project: Project) => {
      const allTeamsSelected =
        availableTeams.length > 0 && selectedTeamSet.size === availableTeams.length
      if (availableTeams.length === 0 || selectedTeamSet.size === 0 || allTeamsSelected) {
        return true
      }
      const projectTeamId = project.teamId ?? ''
      return projectTeamId ? selectedTeamSet.has(projectTeamId) : false
    },
    [selectedTeamSet, availableTeams]
  )

  const scopedProjects = useMemo(() => {
    const query = projectSearch.trim().toLowerCase()
    return projectsSource.filter((project) => {
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
  }, [projectsSource, selectedStatusSet, projectSearch, projectMatchesTeamFilter])

  const foldersToShow = useMemo(() => {
    if (selectedStatusSet.size > 0) {
      return PROJECT_FOLDERS.filter((folder) => selectedStatusSet.has(folder.key))
    }
    return PROJECT_FOLDERS.filter((folder) =>
      scopedProjects.some((project) => toFolderKey(project.status ?? 'NOT_STARTED') === folder.key)
    )
  }, [selectedStatusSet, scopedProjects])

  const displayUsers = useMemo(() => {
    return users.map((user) => {
      if (!user.id) return user
      const override = recommendationOverrides[user.id]
      if (!override) return user
      return {
        ...user,
        recommendedCount: override.recommendedCount,
        recommendedByMe: override.recommendedByMe,
      }
    })
  }, [users, recommendationOverrides])

  const availableUsers = useMemo(() => {
    const selectedIds = new Set(selectedMembers.map((member) => member.id).filter(Boolean))
    return displayUsers.filter((user) => {
      if (user.isAdmin) {
        return false
      }
      if (user.id && selectedIds.has(user.id)) {
        return false
      }
      return true
    })
  }, [displayUsers, selectedMembers])

  const baseCandidates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return availableUsers.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const teamId = user.teamId ?? ''
      const teamLabel = teamById.get(teamId)?.name ?? ''
      const matchesQuery =
        !query || name.includes(query) || email.includes(query) || teamLabel.toLowerCase().includes(query)
      const matchesTeam = !teamFilter || teamId === teamFilter
      const matchesRecommended = !recommendedOnly || (user.recommendedCount ?? 0) > 0
      return matchesQuery && matchesTeam && matchesRecommended
    })
  }, [availableUsers, search, teamFilter, recommendedOnly, teamById])

  const recommendedPool = useMemo(() => {
    if (baseCandidates.length === 0) {
      return [] as UserSummary[]
    }
    const minActive = baseCandidates.reduce((min, user) => {
      const count = user.activeProjectCount ?? 0
      return Math.min(min, count)
    }, Number.POSITIVE_INFINITY)
    return baseCandidates
      .filter((user) => (user.activeProjectCount ?? 0) === minActive)
      .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
  }, [baseCandidates])

  const recommendedIds = useMemo(() => {
    return new Set(recommendedPool.map((user) => user.id).filter(Boolean))
  }, [recommendedPool])

  const visibleUsers = useMemo(() => {
    if (baseCandidates.length === 0) {
      return [] as UserSummary[]
    }
    const rest = baseCandidates
      .filter((user) => !(user.id && recommendedIds.has(user.id)))
      .sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
    return [...recommendedPool, ...rest]
  }, [baseCandidates, recommendedIds, recommendedPool])

  const handleToggleRecommendation = async (user: UserSummary) => {
    if (!user.id || !activeWorkspaceId) return
    try {
      const response = await toggleRecommendation(activeWorkspaceId, user.id)
      setRecommendationOverrides((prev) => ({
        ...prev,
        [user.id as string]: {
          recommendedCount: response.recommendedCount,
          recommendedByMe: response.recommendedByMe,
        },
      }))
      setRecommendersById((prev) => {
        const next = { ...prev }
        delete next[user.id as string]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update recommendation')
    }
  }

  const handleStarEnter = (user: UserSummary) => {
    if (!user.id) return
    setTooltipUserId(user.id)
    if (recommendersById[user.id]) {
      return
    }
    setRecommendersLoadingId(user.id)
    if (!activeWorkspaceId) {
      return
    }
    fetchRecommendationDetails(activeWorkspaceId, user.id)
      .then((data) => {
        setRecommendersById((prev) => ({ ...prev, [user.id as string]: data }))
      })
      .catch((err) => {
        console.error('Recommendation details failed', err)
      })
      .finally(() => {
        setRecommendersLoadingId((prev) => (prev === user.id ? null : prev))
      })
  }

  const handleStarLeave = (user: UserSummary) => {
    if (!user.id) return
    setTooltipUserId((prev) => (prev === user.id ? null : prev))
  }

  const handleAddMember = (user: UserSummary) => {
    if (!canAssign) return
    if (!user.id) return
    setSelectedMembers((prev) => {
      if (prev.some((member) => member.id === user.id)) return prev
      return [...prev, user]
    })
  }

  const handleRemoveMember = (id?: string | null) => {
    if (!canAssign) return
    if (!id) return
    setSelectedMembers((prev) => prev.filter((member) => member.id !== id))
  }

  const handleDragStart = (event: React.DragEvent, userId?: string | null) => {
    if (!canAssign) return
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
    if (!canAssign) return
    const userId = event.dataTransfer.getData('text/plain')
    if (!userId) return
    const user = usersById.get(userId)
    if (user) handleAddMember(user)
  }

  const handleRandomProject = async () => {
    if (assignedToMeOnly) {
      setToast('Turn off Assigned to me to use random project')
      return
    }
    if (!activeWorkspaceId) {
      setError('Select a workspace to continue.')
      return
    }
    try {
      const project = await randomProject(activeWorkspaceId, randomTeamId || undefined)
      if (project.id) {
        onSelectProject(project.id)
      }
      await onRefresh?.()
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setToast(err.message || 'No eligible project')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to pick a random project')
    }
  }

  const handleRandomAssign = async () => {
    if (!selectedProject?.id || selectedIsArchived) {
      return
    }
    if (!activeWorkspaceId) {
      setError('Select a workspace to continue.')
      return
    }
    try {
      const response = await randomAssign(activeWorkspaceId, selectedProject.id, randomTeamId || undefined)
      const assignedId = response.assignedPerson?.id
      if (assignedId) {
        setSelectedMembers((prev) => {
          if (prev.some((member) => member.id === assignedId)) {
            return prev
          }
          return [...prev, response.assignedPerson]
        })
      }
      const assignedName = response.assignedPerson?.displayName ?? response.assignedPerson?.email ?? 'person'
      setToast(`Assigned ${assignedName}`)
      await onRefresh?.()
      await refreshAssignedToMe()
    } catch (err) {
      if (isApiError(err) && err.status === 409) {
        setToast(err.message || 'No eligible people')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to assign randomly')
    }
  }

  const buildProjectPayload = (
    project: Project,
    overrides: Partial<CreateProjectPayload> = {}
  ): CreateProjectPayload => {
    const currentMemberIds = selectedMembers.map((member) => member.id).filter(Boolean) as string[]
    return {
      name: (project.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: project.description ?? undefined,
      status: overrides.status ?? ((project.status ?? 'NOT_STARTED') as ProjectStatus),
      teamId: overrides.teamId ?? (project.teamId ?? currentUser?.teamId ?? ''),
      memberIds: overrides.memberIds ?? currentMemberIds,
    }
  }

  const handleSave = async () => {
    if (!selectedProject || !selectedProject.id || selectedIsArchived || !activeWorkspaceId) return
    setError(null)
    try {
      setSaving(true)
      await updateProject(activeWorkspaceId, selectedProject.id, buildProjectPayload(selectedProject))
      setToast('Saved')
      await onRefresh?.()
      await refreshAssignedToMe()
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
    if (!selectedProject || !selectedProject.id || selectedIsArchived || !activeWorkspaceId) return
    setError(null)
    try {
      setStatusUpdating(true)
      await updateProject(activeWorkspaceId, selectedProject.id, buildProjectPayload(selectedProject, { status }))
      setToast('Status updated')
      await onRefresh?.()
      await refreshAssignedToMe()
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

  const handleRestoreArchived = async () => {
    if (!selectedProject || !selectedProject.id || !activeWorkspaceId) return
    setError(null)
    try {
      setStatusUpdating(true)
      await updateProject(
        activeWorkspaceId,
        selectedProject.id,
        buildProjectPayload(selectedProject, { status: 'NOT_STARTED', memberIds: [] })
      )
      setSelectedMembers([])
      setToast('Restored')
      await onRefresh?.()
      await refreshAssignedToMe()
    } catch (err) {
      if (isApiError(err) && (err.status === 403 || err.status === 404)) {
        if (err.status === 404 && onClearSelection) {
          onClearSelection()
        }
        setError(err.status === 403 ? 'Not allowed' : 'Project not found.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to restore')
    } finally {
      setStatusUpdating(false)
    }
  }

  const handleDeleteArchived = async () => {
    if (!selectedProject || !selectedProject.id || !activeWorkspaceId) return
    const confirmed = window.confirm('Delete this project permanently?')
    if (!confirmed) return
    setError(null)
    try {
      setSaving(true)
      await deleteProject(activeWorkspaceId, selectedProject.id)
      setToast(null)
      await onRefresh?.()
      await refreshAssignedToMe()
      onClearSelection?.()
    } catch (err) {
      if (isApiError(err) && (err.status === 403 || err.status === 404)) {
        if (err.status === 404) {
          onClearSelection?.()
        }
        setError(err.status === 403 ? 'Not allowed' : 'Project not found.')
        return
      }
      setError(err instanceof Error ? err.message : 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel assign-page">
      <div className="panel-header">
        <div>
          <h2>Assign</h2>
        </div>
      </div>
      <div className="assign-layout">
        <div className="card assign-panel assign-panel-projects">
          <div className="assign-panel-header">
            <div className="assign-panel-title">
              <h3>Projects</h3>
              <span className="muted">{assignedToMeLoading ? 'Loading...' : `${projectsSource.length} total`}</span>
            </div>
            <div className="assign-panel-controls">
              <ControlsBar
                searchValue={projectSearch}
                onSearchChange={setProjectSearch}
                searchPlaceholder="Search projects"
                filters={[]}
                actions={
                  <div className="assign-random-tools">
                    <TeamFilterSelect
                      value={projectTeamFilterValue}
                      teams={teams}
                      onChange={handleProjectTeamFilterChange}
                      ariaLabel="Filter projects by team"
                    />
                    <select
                      value={randomTeamId}
                      onChange={(event) => setRandomTeamId(event.target.value)}
                      aria-label="Random team scope"
                      title="Random team scope"
                    >
                      <option value="">Random team</option>
                      {availableTeams.map((teamId) => (
                        <option key={teamId} value={teamId}>
                          {teamById.get(teamId)?.name ?? teamId}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-icon btn-ghost icon-toggle"
                      onClick={handleRandomProject}
                      disabled={assignedToMeOnly || assignedToMeLoading}
                      title={assignedToMeOnly ? 'Turn off Assigned to me to randomize projects' : 'Random project'}
                      data-tooltip="Random project"
                    >
                      <DiceIcon />
                    </button>
                  </div>
                }
              filterSections={[
                {
                  label: 'Statuses',
                  options: PROJECT_FOLDERS.map((folder) => ({
                    id: `status:${folder.key}`,
                    label: folder.label,
                  })),
                },
                {
                  label: 'Extras',
                  options: [
                    { id: 'recommended', label: 'Recommended' },
                    ...(currentUserId ? [{ id: 'assignedToMe', label: 'Assigned to me' }] : []),
                  ],
                },
              ]}
              selectedFilterKeys={selectedFilters}
              onSelectedFilterKeysChange={handleFilterMenuChange}
              searchAriaLabel="Search projects"
              filterAriaLabel="Filter"
              filterActive={isFilterActive}
            />
            </div>
          </div>
          <div className="assign-panel-body assign-folders">
            {foldersToShow.map((folder) => {
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
                    {filteredProjects.map((project, index) => {
                      const id = project.id ?? ''
                      const memberCount = project.memberIds?.length ?? 0
                      const isSelected = selectedProjectId === id
                      return (
                        <button
                          key={project.id ?? project.name ?? 'project-' + folder.key + '-' + index}
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
                              {formatStatusLabel(project.status ?? 'NOT_STARTED')}
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
          <div className="assign-panel-header">
            <div className="assign-panel-title">
              <h3>Available people</h3>
            </div>
            <div className="assign-panel-controls">
              <div className="member-filters">
                <input
                  type="search"
                  placeholder="Search by name or email"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <TeamFilterSelect
                  value={teamFilter}
                  teams={teams}
                  onChange={setTeamFilter}
                  ariaLabel="Filter people by team"
                />
              </div>
            </div>
          </div>
          <div className="assign-panel-body assign-available-body">
            <div className="people-grid available-people-grid">
              {visibleUsers.length === 0 ? (
                <div className="muted">No users match the filters.</div>
              ) : (
                visibleUsers.map((user, index) => {
                  const alreadyAdded = selectedMembers.some((member) => member.id === user.id)
                  const activeCount = user.activeProjectCount ?? 0
                  const isRecommended = Boolean(user.id && recommendedIds.has(user.id))
                  const recommendedCount = user.recommendedCount ?? 0
                  const recommendedByMe = Boolean(user.recommendedByMe)
                  const recommenders = user.id ? recommendersById[user.id] ?? [] : []
                  const tooltipOpen = Boolean(user.id && tooltipUserId === user.id)
                  const tooltipLoading = Boolean(user.id && recommendersLoadingId === user.id)
                  return (
                    <div
                      key={user.id ?? user.email ?? 'user-' + index}
                      className={`card people-card motion-card draggable${isRecommended ? ' is-recommended' : ''}${alreadyAdded ? ' is-selected' : ''}${draggingUserId === user.id ? ' is-dragging' : ''}`}
                      title={`Active projects: ${activeCount}${recommendedCount > 0 ? ` - ${recommendedCount} recommended` : ''}`}
                      draggable={!alreadyAdded && canAssign}
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
                        <span
                          className="muted truncate"
                          title={teamById.get(user.teamId ?? '')?.name ?? 'Team'}
                        >
                          {teamById.get(user.teamId ?? '')?.name ?? 'Team'}
                        </span>
                      </div>
                      <div className="people-card-actions">
                        <div
                          className="recommend-anchor"
                          onMouseEnter={() => handleStarEnter(user)}
                          onMouseLeave={() => handleStarLeave(user)}
                        >
                          <button
                            type="button"
                            className={`people-card-star${recommendedByMe ? ' is-active' : ''}`}
                            aria-label={recommendedByMe ? 'Remove recommendation' : 'Recommend person'}
                            title={recommendedByMe ? 'Recommended' : 'Recommend'}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleToggleRecommendation(user)
                            }}
                            disabled={!user.id}
                          >
                            <StarIcon active={recommendedByMe} />
                            {recommendedCount > 0 ? (
                              <span className="people-card-star-count">{recommendedCount}</span>
                            ) : null}
                          </button>
                          {tooltipOpen ? (
                            <div className={`recommend-tooltip${tooltipOpen ? ' is-open' : ''}`} role="tooltip">
                              {tooltipLoading ? (
                                <span className="muted">Loading...</span>
                              ) : recommenders.length === 0 ? (
                                <span className="muted">No recommendations yet.</span>
                              ) : (
                                recommenders.map((recommender, i) => (
                                  <div
                                    key={recommender.id ?? recommender.email ?? `recommender-${i}`}
                                    className="recommend-tooltip-item truncate"
                                    title={recommender.displayName ?? recommender.email ?? ''}
                                  >
                                    {recommender.displayName ?? recommender.email ?? 'User'}
                                  </div>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
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
                          disabled={alreadyAdded || !canAssign}
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
            selectedIsArchived ? (
              <div className="actions">
                <button type="button" className="btn btn-secondary" onClick={handleRestoreArchived} disabled={statusUpdating}>
                  Restore
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteArchived} disabled={saving}>
                  Delete
                </button>
              </div>
            ) : (
              <div className="row space assign-status-row">
                <div className="assign-status-group">
                  <label className="muted">Status</label>
                  <select
                    className="status-select"
                    value={selectedProject.status ?? 'NOT_STARTED'}
                    onChange={(event) => handleStatusChange(event.target.value as ProjectStatus)}
                    disabled={statusUpdating}
                  >
                    {PROJECT_STATUS_SELECTABLE.map((value) => (
                      <option key={value} value={value}>
                        {formatStatusLabel(value)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-icon btn-ghost icon-toggle"
                  onClick={handleRandomAssign}
                  disabled={statusUpdating || saving || !canAssign}
                  title={randomTeamId ? `Random assign (${randomTeamId})` : 'Random assign'}
                  data-tooltip="Random assign"
                >
                  <DiceIcon />
                </button>
              </div>
            )
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {toast ? <div className="banner info">{toast}</div> : null}
          <div className="assign-panel-body">
            {selectedIsArchived ? (
              <p className="muted">Archived projects can only be restored or deleted.</p>
            ) : (
              <div
                className={`member-dropzone${dragOver ? ' is-over' : ''}${canAssign ? '' : ' is-disabled'}`}
                onDragEnter={(event) => {
                  if (!canAssign) return
                  event.preventDefault()
                  setDragOver(true)
                }}
                onDragOver={(event) => {
                  if (!canAssign) return
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
                    {selectedMembers.map((member, index) => (
                      <span
                        key={member.id ?? member.email ?? 'member-' + index}
                        className="chip"
                        draggable={canAssign}
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
            )}
          </div>
          {!selectedIsArchived ? (
            <div className="assign-bar">
              <div className="assign-bar-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving || !canAssign}
                >
                  {saving ? 'Saving...' : 'Save assignments'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function StarIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="m12 3.4 2.6 5.3 5.8.9-4.2 4.1 1 5.8L12 16.9 6.8 19.5l1-5.8-4.2-4.1 5.8-.9Z"
        fill={active ? 'var(--primary)' : 'none'}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function DiceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="16" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="16" r="1.4" fill="currentColor" />
      <circle cx="16" cy="16" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  )
}
