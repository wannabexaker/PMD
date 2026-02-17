import { useEffect, useMemo, useState } from 'react'
import type {
  PeopleOverviewStatsResponse,
  PeopleUserStatsResponse,
  Person,
  Project,
  UserSummary,
} from '../types'
import { ControlsBar } from './common/ControlsBar'
import { PmdLoader } from './common/PmdLoader'
import { fetchPeopleOverviewStats, fetchPeopleUserStats } from '../api/stats'
import { isApiError } from '../api/http'
import { fetchRecommendationDetails, toggleRecommendation } from '../api/users'
import { updatePeoplePageWidgets } from '../api/auth'
import { useAuth } from '../auth/authUtils'
import type { PeoplePageWidgets } from '../types'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { TeamFilterSelect } from './common/TeamFilterSelect'
import { createPerson, deletePerson, listPeople, updatePerson } from '../api/people'
import {
  clearPeopleSelection,
  getPeopleSelectedFilters,
  getPeopleSelectedUserId,
  setPeopleSelectedFilters,
  setPeopleSelectedUserId,
} from '../ui/uiSelectionStore'

type PeoplePageProps = {
  users: UserSummary[]
  projects: Project[]
  rememberSelection: boolean
}

const MAX_PROJECT_TITLE_LENGTH = 32
const STATUS_COLORS = ['#60a5fa', '#f59e0b', '#22c55e', '#ef4444', '#64748b']
const ACTIVITY_COLORS = ['#22c55e', '#64748b']
const WIDGET_IDS = {
  projectsByStatus: 'projectsByStatus',
  activeVsInactive: 'activeVsInactive',
} as const
const WIDGET_ORDER_DEFAULT = [WIDGET_IDS.projectsByStatus, WIDGET_IDS.activeVsInactive]
const STATUS_LABELS_DEFAULT = ['Not started', 'In progress', 'Completed', 'Canceled', 'Archived']

const DEFAULT_WIDGETS: PeoplePageWidgets = {
  visible: WIDGET_ORDER_DEFAULT,
  order: WIDGET_ORDER_DEFAULT,
  config: {
    [WIDGET_IDS.projectsByStatus]: {
      statuses: STATUS_LABELS_DEFAULT,
    },
  },
}

function mergeWidgetDefaults(input?: PeoplePageWidgets | null) {
  if (!input) {
    return DEFAULT_WIDGETS
  }
  const visible = (input.visible ?? []).filter(Boolean)
  const order = (input.order ?? []).filter(Boolean)
  const mergedVisible = visible.length > 0 ? visible : DEFAULT_WIDGETS.visible
  const mergedOrder = order.length > 0 ? order : DEFAULT_WIDGETS.order
  const mergedConfig = {
    ...DEFAULT_WIDGETS.config,
    ...(input.config ?? {}),
  }
  return {
    visible: mergedVisible,
    order: mergedOrder,
    config: mergedConfig,
  }
}

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '...' : value
}

export function PeoplePage({ users, projects, rememberSelection }: PeoplePageProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() =>
    rememberSelection ? getPeopleSelectedUserId() : null
  )
  const [search, setSearch] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>(() =>
    rememberSelection ? getPeopleSelectedFilters() : []
  )
  const [overviewStats, setOverviewStats] = useState<PeopleOverviewStatsResponse | null>(null)
  const [selectedUserStats, setSelectedUserStats] = useState<PeopleUserStatsResponse | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [recommendationOverrides, setRecommendationOverrides] = useState<
    Record<string, { recommendedCount: number; recommendedByMe: boolean }>
  >({})
  const [tooltipUserId, setTooltipUserId] = useState<string | null>(null)
  const [recommendersById, setRecommendersById] = useState<Record<string, UserSummary[]>>({})
  const [recommendersLoadingId, setRecommendersLoadingId] = useState<string | null>(null)
  const { user: currentUser } = useAuth()
  const { teams, teamById } = useTeams()
  const { activeWorkspaceId } = useWorkspace()
  const isAdmin = Boolean(currentUser?.isAdmin)
  const [widgets, setWidgets] = useState<PeoplePageWidgets>(() => mergeWidgetDefaults(currentUser?.peoplePageWidgets))
  const [widgetsEditing, setWidgetsEditing] = useState(false)
  const [widgetsDraft, setWidgetsDraft] = useState<PeoplePageWidgets | null>(null)
  const [widgetsSaving, setWidgetsSaving] = useState(false)
  const [teamFilterValue, setTeamFilterValue] = useState('')
  const [peopleRecords, setPeopleRecords] = useState<Person[]>([])
  const [peopleLoading, setPeopleLoading] = useState(false)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonEmail, setNewPersonEmail] = useState('')
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [editingPersonName, setEditingPersonName] = useState('')
  const [editingPersonEmail, setEditingPersonEmail] = useState('')
  const [savingPerson, setSavingPerson] = useState(false)

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedUserId) ?? null, [users, selectedUserId])

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

  const projectsByStatusConfig = widgets.config?.[WIDGET_IDS.projectsByStatus]
  const visibleStatusLabels = projectsByStatusConfig?.statuses ?? STATUS_LABELS_DEFAULT

  const filteredStatusSlices = useMemo(() => {
    return selectedStatusSlices.filter((slice) => visibleStatusLabels.includes(slice.label))
  }, [selectedStatusSlices, visibleStatusLabels])

  const orderedWidgetIds = useMemo(() => {
    const order = widgets.order?.length ? widgets.order : WIDGET_ORDER_DEFAULT
    const visibleSet = new Set(widgets.visible)
    const visibleOrdered = order.filter((id) => visibleSet.has(id))
    return visibleOrdered.length > 0 ? visibleOrdered : WIDGET_ORDER_DEFAULT
  }, [widgets])

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
    return teams.map((team) => team.id).filter(Boolean) as string[]
  }, [teams])

  const defaultTeamFilters = useMemo(() => {
    return availableTeams.map((team) => `team:${team}`)
  }, [availableTeams])

  const selectedFilterKeys = selectedFilters.length === 0 ? defaultTeamFilters : selectedFilters

  const selectedTeamSet = useMemo(() => {
    return new Set(
      selectedFilterKeys
        .filter((value) => value.startsWith('team:'))
        .map((value) => value.replace('team:', ''))
        .filter((team) => availableTeams.includes(team))
    )
  }, [selectedFilterKeys, availableTeams])

  const recommendedOnly = selectedFilterKeys.includes('recommended')

  const isFilterActive = useMemo(() => {
    if (selectedFilterKeys.includes('recommended')) {
      return true
    }
    return selectedFilterKeys.length !== defaultTeamFilters.length
  }, [selectedFilterKeys, defaultTeamFilters])

  const teamFilterActive = useMemo(() => {
    if (availableTeams.length === 0) {
      return false
    }
    if (selectedTeamSet.size === 0) {
      return false
    }
    return selectedTeamSet.size < availableTeams.length
  }, [availableTeams, selectedTeamSet])

  useEffect(() => {
    if (selectedTeamSet.size === 1) {
      setTeamFilterValue(Array.from(selectedTeamSet)[0])
    } else {
      setTeamFilterValue('')
    }
  }, [selectedTeamSet])

  useEffect(() => {
    if (!rememberSelection) {
      clearPeopleSelection()
      return
    }
    setPeopleSelectedUserId(selectedUserId)
  }, [selectedUserId, rememberSelection])

  useEffect(() => {
    if (!rememberSelection) {
      clearPeopleSelection()
      return
    }
    setPeopleSelectedFilters(selectedFilters)
  }, [selectedFilters, rememberSelection])

  useEffect(() => {
    return () => {
      if (!rememberSelection) {
        clearPeopleSelection()
      }
    }
  }, [rememberSelection])

  const handleTeamFilterChange = (value: string) => {
    const keep = selectedFilterKeys.filter((key) => !key.startsWith('team:'))
    const teamFilters = value ? [`team:${value}`] : defaultTeamFilters
    setSelectedFilters([...keep, ...teamFilters])
  }

  const handleFilterMenuChange = (next: string[]) => {
    setSelectedFilters((prev) => {
      const teamFilters = prev.filter((key) => key.startsWith('team:'))
      const nonTeam = next.filter((key) => !key.startsWith('team:'))
      return [...nonTeam, ...teamFilters]
    })
  }

  useEffect(() => {
    let active = true
    if (!activeWorkspaceId) {
      setOverviewStats(null)
      return () => {
        active = false
      }
    }
    fetchPeopleOverviewStats(activeWorkspaceId)
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
  }, [activeWorkspaceId])

  useEffect(() => {
    let active = true
    setPeopleLoading(true)
    setPeopleError(null)
    if (!activeWorkspaceId || !isAdmin) {
      setPeopleRecords([])
      setPeopleLoading(false)
      return () => {
        active = false
      }
    }
    listPeople(activeWorkspaceId)
      .then((data) => {
        if (active) {
          const sorted = [...data].sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
          setPeopleRecords(sorted)
        }
      })
      .catch((err) => {
        if (active) {
          setPeopleError(err instanceof Error ? err.message : 'Failed to load people records')
        }
      })
      .finally(() => {
        if (active) setPeopleLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId, isAdmin])

  useEffect(() => {
    setWidgets(mergeWidgetDefaults(currentUser?.peoplePageWidgets))
  }, [currentUser])

  useEffect(() => {
    if (!selectedUserId) {
      return
    }
    let active = true
    if (!activeWorkspaceId) {
      setSelectedUserStats(null)
      setStatsLoading(false)
      return () => {
        active = false
      }
    }
    fetchPeopleUserStats(activeWorkspaceId, selectedUserId)
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
  }, [selectedUserId, activeWorkspaceId])

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

  const baseCandidates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return displayUsers.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const teamId = user.teamId ?? ''
      const teamLabel = teamById.get(teamId)?.name ?? 'Team'
      if (user.isAdmin) {
        return false
      }
      const matchesQuery =
        !query || name.includes(query) || email.includes(query) || teamLabel.toLowerCase().includes(query)
      const matchesTeam = !teamFilterActive || selectedTeamSet.has(teamId)
      const matchesRecommended = !recommendedOnly || (user.recommendedCount ?? 0) > 0
      return matchesQuery && matchesTeam && matchesRecommended
    })
  }, [displayUsers, search, selectedTeamSet, recommendedOnly, teamById, teamFilterActive])

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
      setStatsError(err instanceof Error ? err.message : 'Failed to update recommendation')
    }
  }

  const handleStarEnter = (user: UserSummary) => {
    if (!user.id || !activeWorkspaceId) return
    setTooltipUserId(user.id)
    if (recommendersById[user.id]) {
      return
    }
    setRecommendersLoadingId(user.id)
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

  const handleSelectUser = (id: string | null) => {
    const next = selectedUserId === id ? null : id
    setSelectedUserId(next)
    if (!next) {
      setSelectedUserStats(null)
      setStatsError(null)
      setStatsLoading(false)
      return
    }
    setSelectedUserStats(null)
    setStatsError(null)
    setStatsLoading(true)
  }

  const handleEditWidgets = () => {
    setWidgetsDraft(mergeWidgetDefaults(widgets))
    setWidgetsEditing(true)
  }

  const handleCancelWidgets = () => {
    setWidgetsEditing(false)
    setWidgetsDraft(null)
  }

  const handleToggleWidget = (widgetId: string) => {
    if (!widgetsDraft) return
    const isVisible = widgetsDraft.visible.includes(widgetId)
    const nextVisible = isVisible
      ? widgetsDraft.visible.filter((id) => id !== widgetId)
      : [...widgetsDraft.visible, widgetId]
    setWidgetsDraft({
      ...widgetsDraft,
      visible: nextVisible,
    })
  }

  const handleToggleStatusFilter = (label: string) => {
    if (!widgetsDraft) return
    const current = widgetsDraft.config?.[WIDGET_IDS.projectsByStatus]?.statuses ?? STATUS_LABELS_DEFAULT
    const next = current.includes(label) ? current.filter((item) => item !== label) : [...current, label]
    setWidgetsDraft({
      ...widgetsDraft,
      config: {
        ...(widgetsDraft.config ?? {}),
        [WIDGET_IDS.projectsByStatus]: {
          statuses: next,
        },
      },
    })
  }

  const handleSaveWidgets = async () => {
    if (!widgetsDraft) return
    setWidgetsSaving(true)
    try {
      const saved = await updatePeoplePageWidgets(widgetsDraft)
      setWidgets(mergeWidgetDefaults(saved))
      setWidgetsEditing(false)
      setWidgetsDraft(null)
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to save widgets')
    } finally {
      setWidgetsSaving(false)
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>People</h2>
        </div>
      </div>
      {isAdmin ? (
        <div className="card">
          <div className="panel-header">
            <div>
              <h3>People records</h3>
            </div>
          </div>
          {peopleError ? <p className="error">{peopleError}</p> : null}
          <div className="row space">
            <input
              type="text"
              placeholder="Full name"
              value={newPersonName}
              onChange={(event) => setNewPersonName(event.target.value)}
            />
            <input
              type="email"
              placeholder="Email (optional)"
              value={newPersonEmail}
              onChange={(event) => setNewPersonEmail(event.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={savingPerson || !newPersonName.trim()}
              onClick={async () => {
                if (!activeWorkspaceId) {
                  setPeopleError('Select a workspace to continue.')
                  return
                }
                setSavingPerson(true)
                try {
                  const created = await createPerson(activeWorkspaceId, {
                    displayName: newPersonName.trim(),
                    email: newPersonEmail.trim() || undefined,
                  })
                  setPeopleRecords((prev) => {
                    const next = [created, ...prev]
                    return next.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''))
                  })
                  setNewPersonName('')
                  setNewPersonEmail('')
                } catch (err) {
                  setPeopleError(err instanceof Error ? err.message : 'Failed to create person')
                } finally {
                  setSavingPerson(false)
                }
              }}
            >
              {savingPerson ? 'Creating...' : 'Create'}
            </button>
          </div>
          <ul className="list compact">
            {peopleLoading ? <li className="muted">Loading people records...</li> : null}
            {peopleRecords.length === 0 && !peopleLoading ? <li className="muted">No records found.</li> : null}
            {peopleRecords.map((person) => {
              const isEditing = editingPersonId === person.id
              return (
                <li key={person.id ?? person.email ?? person.displayName} className="row space">
                  {isEditing ? (
                    <div className="row space">
                      <input
                        type="text"
                        value={editingPersonName}
                        onChange={(event) => setEditingPersonName(event.target.value)}
                      />
                      <input
                        type="email"
                        value={editingPersonEmail}
                        onChange={(event) => setEditingPersonEmail(event.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <strong className="truncate" title={person.displayName ?? ''}>
                        {person.displayName ?? '-'}
                      </strong>
                      <div className="muted truncate" title={person.email ?? ''}>
                        {person.email ?? ''}
                      </div>
                    </div>
                  )}
                  <div className="actions-right">
                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={savingPerson || !editingPersonName.trim() || !person.id}
                          onClick={async () => {
                            if (!person.id) return
                            if (!activeWorkspaceId) {
                              setPeopleError('Select a workspace to continue.')
                              return
                            }
                            setSavingPerson(true)
                            try {
                              const updated = await updatePerson(activeWorkspaceId, person.id, {
                                displayName: editingPersonName.trim(),
                                email: editingPersonEmail.trim() || undefined,
                              })
                              setPeopleRecords((prev) =>
                                prev.map((item) => (item.id === updated.id ? updated : item))
                              )
                              setEditingPersonId(null)
                              setEditingPersonName('')
                              setEditingPersonEmail('')
                            } catch (err) {
                              setPeopleError(err instanceof Error ? err.message : 'Failed to update person')
                            } finally {
                              setSavingPerson(false)
                            }
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditingPersonId(null)
                            setEditingPersonName('')
                            setEditingPersonEmail('')
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setEditingPersonId(person.id ?? null)
                            setEditingPersonName(person.displayName ?? '')
                            setEditingPersonEmail(person.email ?? '')
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={async () => {
                            if (!person.id) return
                            const confirmed = window.confirm('Delete this person record?')
                            if (!confirmed) return
                            if (!activeWorkspaceId) {
                              setPeopleError('Select a workspace to continue.')
                              return
                            }
                            try {
                              setSavingPerson(true)
                              await deletePerson(activeWorkspaceId, person.id)
                              setPeopleRecords((prev) => prev.filter((item) => item.id !== person.id))
                            } catch (err) {
                              setPeopleError(err instanceof Error ? err.message : 'Failed to delete person')
                            } finally {
                              setSavingPerson(false)
                            }
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
      <div className="dashboard-controls">
        <ControlsBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search people"
          filters={[]}
          filterSections={[
            {
              label: 'Extras',
              options: [{ id: 'recommended', label: 'Recommended' }],
            },
          ]}
          selectedFilterKeys={selectedFilterKeys}
          onSelectedFilterKeysChange={handleFilterMenuChange}
          searchAriaLabel="Search people"
          filterAriaLabel="Filter"
          searchOverlay
          filterActive={isFilterActive}
          actions={
            <TeamFilterSelect
              value={teamFilterValue}
              teams={teams}
              onChange={handleTeamFilterChange}
              ariaLabel="Filter people by team"
            />
          }
        />
      </div>
      <div className="people-layout">
        <div className="card people-directory-card">
          <div className="panel-header">
            <div>
              <h3>Directory</h3>
            </div>
          </div>
          <div className="people-directory-scroll">
            <div className="people-grid people-directory">
              {visibleUsers.length === 0 ? <div className="muted">No people yet in this workspace.</div> : null}
              {visibleUsers.map((user, index) => {
                const isRecommended = Boolean(user.id && recommendedIds.has(user.id))
                const recommendedCount = user.recommendedCount ?? 0
                const recommendedByMe = Boolean(user.recommendedByMe)
                const recommenders = user.id ? recommendersById[user.id] ?? [] : []
                const tooltipOpen = Boolean(user.id && tooltipUserId === user.id)
                const tooltipLoading = Boolean(user.id && recommendersLoadingId === user.id)
                return (
                <button
                  key={user.id ?? user.email ?? 'user-' + index}
                  type="button"
                  className={`card people-card motion-card${isRecommended ? ' is-recommended' : ''}${selectedUserId === user.id ? ' selected project-row' : ''}`}
                  onClick={() => {
                    const id = user.id ?? null
                    handleSelectUser(id)
                  }}
                  title={`${user.displayName ?? ''}${user.email ? ` - ${user.email}` : ''}${recommendedCount > 0 ? ` - ${recommendedCount} recommended` : ''}`}
                  aria-pressed={selectedUserId === user.id}
                >
                  <div className="people-card-main">
                    <div className="row space">
                      <strong className="truncate" title={user.displayName ?? ''}>
                        {user.displayName ?? '-'}
                      </strong>
                      {user.roleName ? <span className="pill">{user.roleName}</span> : null}
                    </div>
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
                            <span className="muted">No Rec yet.</span>
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
                  </div>
                </button>
              )})}
            </div>
          </div>
        </div>
        <div className="card people-details-card">
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
                    {selectedUser.roleName ? <span className="pill">{selectedUser.roleName}</span> : null}
                    <div
                      className="muted truncate"
                      title={teamById.get(selectedUser.teamId ?? '')?.name ?? 'Team'}
                    >
                      {teamById.get(selectedUser.teamId ?? '')?.name ?? 'Team'}
                    </div>
                  </div>
                  <div className="people-widgets-toolbar">
                    <button type="button" className="btn btn-secondary" onClick={handleEditWidgets}>
                      Edit
                    </button>
                    {widgetsEditing && widgetsDraft ? (
                      <div className="people-widgets-editor">
                        <div className="people-widgets-editor-section">
                          <strong>Widgets</strong>
                          {WIDGET_ORDER_DEFAULT.map((widgetId) => (
                            <label key={widgetId} className="widget-toggle">
                              <input
                                type="checkbox"
                                checked={widgetsDraft.visible.includes(widgetId)}
                                onChange={() => handleToggleWidget(widgetId)}
                              />
                              <span>{widgetId === WIDGET_IDS.projectsByStatus ? 'Projects by status' : 'Active vs inactive'}</span>
                            </label>
                          ))}
                        </div>
                        <div className="people-widgets-editor-section">
                          <strong>Projects by status</strong>
                          <div className="widget-chip-row">
                            {STATUS_LABELS_DEFAULT.map((label) => (
                              <button
                                key={label}
                                type="button"
                                className={`chip${(widgetsDraft.config?.[WIDGET_IDS.projectsByStatus]?.statuses ?? STATUS_LABELS_DEFAULT).includes(label) ? ' is-active' : ''}`}
                                onClick={() => handleToggleStatusFilter(label)}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="people-widgets-editor-actions">
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={handleCancelWidgets}
                            disabled={widgetsSaving}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSaveWidgets}
                            disabled={widgetsSaving}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                {statsError ? <p className="error">Failed to load stats.</p> : null}
                {statsLoading ? (
                  <PmdLoader size="sm" variant="panel" />
                ) : statsError ? null : (
                  <div className="people-stats">
                    {orderedWidgetIds.map((widgetId) => {
                      if (widgetId === WIDGET_IDS.projectsByStatus) {
                        return (
                          <div key={widgetId} className="card stats-card">
                            <h4>Projects by status</h4>
                            <PieChart data={filteredStatusSlices} />
                          </div>
                        )
                      }
                      if (widgetId === WIDGET_IDS.activeVsInactive) {
                        return (
                          <div key={widgetId} className="card stats-card">
                            <h4>Active vs inactive</h4>
                            <PieChart data={selectedActivitySlices} />
                          </div>
                        )
                      }
                      return null
                    })}
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
                            {projectsForStatus.map((project, index) => (
                              <div
                                key={project.id ?? project.name ?? 'project-' + status + '-' + index}
                                className="card project-preview"
                              >
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
  const dashValues = data.map((slice) => (slice.value / total) * circumference)
  const cumulative = dashValues.reduce<number[]>((acc, dash, index) => {
    const previous = index === 0 ? 0 : acc[index - 1]
    acc.push(previous + dash)
    return acc
  }, [])

  return (
    <div className="pie-chart">
      <svg viewBox="0 0 120 120" width="120" height="120" aria-hidden="true">
        <circle cx="60" cy="60" r={radius} stroke="var(--border)" strokeWidth="14" fill="none" />
        {data.map((slice, index) => {
          if (slice.value === 0) return null
          const dash = dashValues[index]
          const dashArray = `${dash} ${circumference - dash}`
          const previous = index === 0 ? 0 : cumulative[index - 1]
          const dashOffset = circumference - previous
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
