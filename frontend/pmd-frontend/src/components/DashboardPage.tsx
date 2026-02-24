import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import type {
  CreateProjectPayload,
  Project,
  ProjectStatus,
  User,
  UserSummary,
  WorkspaceDashboardStatsResponse,
  WorkspaceSummaryPanelKey,
} from '../types'
import { CreateProjectForm } from './CreateProjectForm'
import { deleteProject, updateProject } from '../api/projects'
import { ControlsBar } from './common/ControlsBar'
import { FilterMenu } from './FilterMenu'
import { MentionTextarea } from './common/MentionTextarea'
import { PieChart } from './common/PieChart'
import { ProjectComments } from './ProjectComments'
import { isApiError } from '../api/http'
import { useNavigate } from 'react-router-dom'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { useMentionOptions } from '../mentions/useMentionOptions'
import { formatMentionText } from '../mentions/formatMentionText'
import { MentionText } from '../mentions/MentionText'
import { navigateFromMention } from '../mentions/mentionNavigation'
import { fetchDashboardStats } from '../api/stats'
import { fetchWorkspacePanelPreferences, saveWorkspacePanelPreferences } from '../api/preferences'
import {
  UNASSIGNED_FILTER_KEY,
  PROJECT_FOLDERS,
  PROJECT_STATUS_FLOW,
  PROJECT_STATUS_SELECTABLE,
  formatStatusLabel,
  toFolderKey,
} from '../projects/statuses'
import { WORKSPACE_SUMMARY_PANEL_KEYS } from '../types'

type DashboardPageProps = {
  projects: Project[]
  users: UserSummary[]
  currentUser: User | null
  selectedProjectId: string | null
  onSelectProject: (id: string) => void
  onClearSelection: () => void
  onCreated: (project?: Project) => void
  onRefresh: () => void
  requireTeamOnProjectCreate?: boolean
}

const MAX_PROJECT_TITLE_LENGTH = 32
const STATUS_COLORS = ['#a855f7', '#38bdf8', '#22c55e', '#f97316', '#64748b']
const TEAM_COLORS = ['#38bdf8', '#a855f7', '#f97316', '#22c55e', '#facc15', '#e879f9']
type DashboardChartId = 'projectsByStatus' | 'projectsByTeam' | 'workloadByTeam' | 'assignmentCoverage'
const DASHBOARD_CHART_ORDER_DEFAULT: DashboardChartId[] = [
  'projectsByStatus',
  'projectsByTeam',
  'workloadByTeam',
  'assignmentCoverage',
]
const DASHBOARD_CHART_MIN_HEIGHT = 330
const DASHBOARD_CHART_MAX_HEIGHT = 760
const SUMMARY_PANELS: Array<{ key: WorkspaceSummaryPanelKey; label: string; description: string }> = [
  { key: 'unassigned', label: 'Unassigned', description: 'Projects without any members' },
  { key: 'assigned', label: 'Assigned', description: 'Projects with team members' },
  { key: 'inProgress', label: 'In progress', description: 'Work is actively happening' },
  { key: 'completed', label: 'Completed', description: 'Finished projects' },
  { key: 'canceled', label: 'Canceled', description: 'Canceled or stopped projects' },
  { key: 'archived', label: 'Archived', description: 'Archived or closed projects' },
]
const SUMMARY_PANEL_MEASURE_LABEL: Record<WorkspaceSummaryPanelKey, string> = {
  unassigned: 'Unassigned projects',
  assigned: 'Assigned projects',
  inProgress: 'Active projects',
  completed: 'Completed projects',
  canceled: 'Canceled projects',
  archived: 'Archived projects',
}

type SummaryRange = '1m' | '10m' | '30m' | '1h' | '8h' | '12h' | '24h' | '7d' | '30d' | '1y' | '2y' | '5y'
type WorkspaceSummarySnapshot = {
  ts: number
  counters: Record<WorkspaceSummaryPanelKey, number>
}
const SUMMARY_RANGE_OPTIONS: Array<{ id: SummaryRange; label: string }> = [
  { id: '1m', label: '1m' },
  { id: '10m', label: '10m' },
  { id: '30m', label: '30m' },
  { id: '1h', label: '1h' },
  { id: '8h', label: '8h' },
  { id: '12h', label: '12h' },
  { id: '24h', label: '24h' },
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '1y', label: '1y' },
  { id: '2y', label: '2y' },
  { id: '5y', label: '5y' },
]
const SUMMARY_HISTORY_KEY_PREFIX = 'pmd.workspaceSummaryHistory.'
const SUMMARY_HISTORY_MAX = 8000
const SUMMARY_RANGE_KEY_PREFIX = 'pmd.workspaceSummaryRange.'
const SUMMARY_SNAPSHOT_INTERVAL_MS = 10 * 1000
const SUMMARY_DUPLICATE_GUARD_MS = 5 * 1000

const DEFAULT_PANEL_VISIBILITY: Record<WorkspaceSummaryPanelKey, boolean> = WORKSPACE_SUMMARY_PANEL_KEYS.reduce(
  (acc, key) => {
    acc[key] = true
    return acc
  },
  {} as Record<WorkspaceSummaryPanelKey, boolean>
)

function buildPanelVisibility(
  override?: Record<WorkspaceSummaryPanelKey, boolean>
): Record<WorkspaceSummaryPanelKey, boolean> {
  const base = { ...DEFAULT_PANEL_VISIBILITY }
  if (!override) {
    return base
  }
  for (const key of WORKSPACE_SUMMARY_PANEL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(override, key) && override[key] != null) {
      base[key] = override[key] as boolean
    }
  }
  return base
}

function SummaryMenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M7 8h10l-5 8z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 16h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '...'
    : value
}

function readSummaryHistory(workspaceId: string): WorkspaceSummarySnapshot[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`${SUMMARY_HISTORY_KEY_PREFIX}${workspaceId}`)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WorkspaceSummarySnapshot[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item && typeof item.ts === 'number' && item.counters)
      .sort((a, b) => a.ts - b.ts)
      .slice(-SUMMARY_HISTORY_MAX)
  } catch {
    return []
  }
}

function writeSummaryHistory(workspaceId: string, data: WorkspaceSummarySnapshot[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(`${SUMMARY_HISTORY_KEY_PREFIX}${workspaceId}`, JSON.stringify(data.slice(-SUMMARY_HISTORY_MAX)))
  } catch {
    // ignore storage errors
  }
}

function compactSummaryHistory(data: WorkspaceSummarySnapshot[]): WorkspaceSummarySnapshot[] {
  if (data.length <= 1) {
    return data
  }
  const latestTs = data[data.length - 1]?.ts ?? Date.now()
  const kept: WorkspaceSummarySnapshot[] = []
  const seen = new Set<string>()
  for (let index = data.length - 1; index >= 0; index -= 1) {
    const item = data[index]
    const age = latestTs - item.ts
    if (age <= 24 * 60 * 60 * 1000) {
      kept.push(item)
      continue
    }
    let bucketMs = 60 * 60 * 1000
    if (age > 365 * 24 * 60 * 60 * 1000) {
      bucketMs = 30 * 24 * 60 * 60 * 1000
    } else if (age > 30 * 24 * 60 * 60 * 1000) {
      bucketMs = 6 * 60 * 60 * 1000
    }
    const bucket = Math.floor(item.ts / bucketMs)
    const key = `${bucketMs}:${bucket}`
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    kept.push(item)
  }
  return kept.reverse().slice(-SUMMARY_HISTORY_MAX)
}

function readSummaryRange(workspaceId: string): SummaryRange {
  if (typeof window === 'undefined') return '24h'
  const value = localStorage.getItem(`${SUMMARY_RANGE_KEY_PREFIX}${workspaceId}`)
  return value === '1m' || value === '10m' || value === '30m' || value === '1h' || value === '8h' || value === '12h' || value === '24h' || value === '7d' || value === '30d' || value === '1y' || value === '2y' || value === '5y' ? value : '24h'
}

function writeSummaryRange(workspaceId: string, range: SummaryRange) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`${SUMMARY_RANGE_KEY_PREFIX}${workspaceId}`, range)
}

function getSummaryRangeConfig(range: SummaryRange): { lookbackMs: number; bucketMs: number } {
  if (range === '1m') return { lookbackMs: 60 * 1000, bucketMs: 10 * 1000 }
  if (range === '10m') return { lookbackMs: 10 * 60 * 1000, bucketMs: 60 * 1000 }
  if (range === '30m') return { lookbackMs: 30 * 60 * 1000, bucketMs: 3 * 60 * 1000 }
  if (range === '1h') return { lookbackMs: 60 * 60 * 1000, bucketMs: 10 * 60 * 1000 }
  if (range === '8h') return { lookbackMs: 8 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 }
  if (range === '12h') return { lookbackMs: 12 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 }
  if (range === '24h') return { lookbackMs: 24 * 60 * 60 * 1000, bucketMs: 2 * 60 * 60 * 1000 }
  if (range === '7d') return { lookbackMs: 7 * 24 * 60 * 60 * 1000, bucketMs: 12 * 60 * 60 * 1000 }
  if (range === '30d') return { lookbackMs: 30 * 24 * 60 * 60 * 1000, bucketMs: 24 * 60 * 60 * 1000 }
  if (range === '1y') return { lookbackMs: 365 * 24 * 60 * 60 * 1000, bucketMs: 30 * 24 * 60 * 60 * 1000 }
  if (range === '2y') return { lookbackMs: 2 * 365 * 24 * 60 * 60 * 1000, bucketMs: 30 * 24 * 60 * 60 * 1000 }
  return { lookbackMs: 5 * 365 * 24 * 60 * 60 * 1000, bucketMs: 30 * 24 * 60 * 60 * 1000 }
}

function buildSummaryBuckets(
  history: WorkspaceSummarySnapshot[],
  now: number,
  lookbackMs: number,
  bucketMs: number
): WorkspaceSummarySnapshot[] {
  const start = now - lookbackMs
  const bucketCount = Math.max(2, Math.ceil(lookbackMs / Math.max(1, bucketMs)))
  let startIndex = 0
  while (startIndex < history.length && history[startIndex].ts < start) {
    startIndex += 1
  }
  const baseline = startIndex > 0 ? history[startIndex - 1] : history[0] ?? null
  const next: WorkspaceSummarySnapshot[] = []
  let cursor = startIndex
  let lastCounters = baseline?.counters ?? null
  for (let index = 0; index < bucketCount; index += 1) {
    const bucketStart = start + index * bucketMs
    const bucketEnd = index === bucketCount - 1 ? now : bucketStart + bucketMs
    while (cursor < history.length && history[cursor].ts <= bucketEnd) {
      lastCounters = history[cursor].counters
      cursor += 1
    }
    const counters = WORKSPACE_SUMMARY_PANEL_KEYS.reduce((acc, key) => {
      acc[key] = lastCounters?.[key] ?? 0
      return acc
    }, {} as Record<WorkspaceSummaryPanelKey, number>)
    next.push({
      ts: bucketEnd,
      counters,
    })
  }
  return next
}

function buildTrendPath(values: number[], width: number, height: number): string {
  if (values.length <= 1) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const stepX = width / Math.max(1, values.length - 1)
  return values
    .map((value, index) => {
      const x = index * stepX
      const ratio = (value - min) / span
      const y = height - ratio * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function buildTrendAreaPath(values: number[], width: number, height: number): string {
  if (values.length <= 1) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(1, max - min)
  const stepX = width / Math.max(1, values.length - 1)
  const line = values
    .map((value, index) => {
      const x = index * stepX
      const ratio = (value - min) / span
      const y = height - ratio * height
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
  return `${line} L ${width.toFixed(2)} ${height.toFixed(2)} L 0 ${height.toFixed(2)} Z`
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
  requireTeamOnProjectCreate = false,
}: DashboardPageProps) {
  const navigate = useNavigate()
  const { teams } = useTeams()
  const { activeWorkspaceId } = useWorkspace()
  const mentionOptions = useMentionOptions(users)
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
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false)
  const initializedTeamsRef = useRef(false)
  const currentUserId = currentUser?.id ?? ''
  const [workspaceStats, setWorkspaceStats] = useState<WorkspaceDashboardStatsResponse | null>(null)
  const [workspaceStatsError, setWorkspaceStatsError] = useState<string | null>(null)
  const [panelVisibility, setPanelVisibility] = useState<Record<WorkspaceSummaryPanelKey, boolean>>(() =>
    buildPanelVisibility()
  )
  const [summaryRange, setSummaryRange] = useState<SummaryRange>('24h')
  const [summaryHistory, setSummaryHistory] = useState<WorkspaceSummarySnapshot[]>([])
  const [chartOrder, setChartOrder] = useState<DashboardChartId[]>(DASHBOARD_CHART_ORDER_DEFAULT)
  const [draggingChart, setDraggingChart] = useState<DashboardChartId | null>(null)
  const [dragOverChart, setDragOverChart] = useState<DashboardChartId | null>(null)
  const [chartHeights, setChartHeights] = useState<Record<DashboardChartId, number>>({
    projectsByStatus: 420,
    projectsByTeam: 420,
    workloadByTeam: 420,
    assignmentCoverage: 420,
  })
  const [chartRowSpans, setChartRowSpans] = useState<Record<DashboardChartId, number>>({
    projectsByStatus: 1,
    projectsByTeam: 1,
    workloadByTeam: 1,
    assignmentCoverage: 1,
  })
  const [activeChartResize, setActiveChartResize] = useState<{
    id: DashboardChartId
    edge: 'top' | 'bottom'
    startY: number
    startHeight: number
  } | null>(null)
  const chartRefs = useRef<Record<DashboardChartId, HTMLDivElement | null>>({
    projectsByStatus: null,
    projectsByTeam: null,
    workloadByTeam: null,
    assignmentCoverage: null,
  })

  const availableTeamIds = useMemo(() => {
    return teams.map((team) => team.id).filter(Boolean) as string[]
  }, [teams])

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
      if (user.id && user.teamId) {
        map.set(user.id, user.teamId)
      }
    })
    return map
  }, [users])

  const teamLabelByKey = useMemo(() => {
    const map = new Map<string, string>()
    teams.forEach((team) => {
      if (team.id) {
        map.set(team.id, team.name ?? team.id)
      }
    })
    return map
  }, [teams])

  const statusFilterOptions = useMemo(
    () => [
      ...PROJECT_FOLDERS.map((folder) => ({
        id: `status:${folder.key}`,
        label: folder.label,
      })),
      { id: `status:${UNASSIGNED_FILTER_KEY}`, label: 'Unassigned' },
    ],
    []
  )

  const teamFilterOptions = useMemo(
    () =>
      teams
        .filter((team) => team.id)
        .map((team) => ({
          id: `team:${team.id ?? ''}`,
          label: team.name ?? team.id ?? 'Team',
        })),
    [teams]
  )

  const dashboardFilterSections = useMemo(() => {
    const sections = [{ label: 'Statuses', options: statusFilterOptions }]
    if (teamFilterOptions.length > 0) {
      sections.push({ label: 'Teams', options: teamFilterOptions })
    }
    return sections
  }, [statusFilterOptions, teamFilterOptions])

  const visiblePanels = useMemo(
    () => SUMMARY_PANELS.filter((panel) => panelVisibility[panel.key]),
    [panelVisibility]
  )
  const computedWorkspaceCounters = useMemo(() => {
    const counters = WORKSPACE_SUMMARY_PANEL_KEYS.reduce((acc, key) => {
      acc[key] = 0
      return acc
    }, {} as Record<WorkspaceSummaryPanelKey, number>)
    for (const project of projects) {
      const memberCount = (project.memberIds ?? []).length
      if (memberCount > 0) {
        counters.assigned += 1
      } else {
        counters.unassigned += 1
      }
      const status = project.status ?? 'NOT_STARTED'
      if (status === 'IN_PROGRESS') counters.inProgress += 1
      if (status === 'COMPLETED') counters.completed += 1
      if (status === 'CANCELED') counters.canceled += 1
      if (status === 'ARCHIVED') counters.archived += 1
    }
    return counters
  }, [projects])
  const panelCounts = workspaceStats?.counters ?? computedWorkspaceCounters
  const getPanelValue = useCallback(
    (panelKey: WorkspaceSummaryPanelKey) => {
      if (!panelCounts) {
        return 0
      }
      return panelCounts[panelKey] ?? 0
    },
    [panelCounts]
  )

  const summarySelectedKeys = useMemo(
    () => WORKSPACE_SUMMARY_PANEL_KEYS.filter((key) => Boolean(panelVisibility[key])),
    [panelVisibility]
  )
  const summaryRangeConfig = useMemo(() => getSummaryRangeConfig(summaryRange), [summaryRange])
  const appendSummarySnapshot = useCallback(() => {
    if (!activeWorkspaceId || !panelCounts) {
      return
    }
    const snapshot: WorkspaceSummarySnapshot = {
      ts: Date.now(),
      counters: WORKSPACE_SUMMARY_PANEL_KEYS.reduce((acc, key) => {
        acc[key] = panelCounts[key] ?? 0
        return acc
      }, {} as Record<WorkspaceSummaryPanelKey, number>),
    }
    setSummaryHistory((prev) => {
      const last = prev[prev.length - 1]
      if (last) {
        const sameCounters = WORKSPACE_SUMMARY_PANEL_KEYS.every((key) => (last.counters[key] ?? 0) === snapshot.counters[key])
        if (sameCounters && snapshot.ts - last.ts < SUMMARY_DUPLICATE_GUARD_MS) {
          return prev
        }
      }
      const appended = [...prev, snapshot]
      const next = appended.length > SUMMARY_HISTORY_MAX ? compactSummaryHistory(appended) : appended
      writeSummaryHistory(activeWorkspaceId, next)
      return next
    })
  }, [activeWorkspaceId, panelCounts])
  const summaryTrendData = useMemo(() => {
    const now = Date.now()
    const bucketedHistory = buildSummaryBuckets(
      summaryHistory,
      now,
      summaryRangeConfig.lookbackMs,
      summaryRangeConfig.bucketMs
    )
    return WORKSPACE_SUMMARY_PANEL_KEYS.reduce((acc, key) => {
      const points = bucketedHistory.map((item) => item.counters[key] ?? 0)
      const min = points.length > 0 ? Math.min(...points) : 0
      const max = points.length > 0 ? Math.max(...points) : 0
      const sum = points.reduce((total, point) => total + point, 0)
      const avg = points.length > 0 ? sum / points.length : 0
      const last = points.length > 0 ? points[points.length - 1] : 0
      acc[key] = {
        points,
        min,
        max,
        avg,
        last,
        path: points.length > 1 ? buildTrendPath(points, 100, 40) : '',
        areaPath: points.length > 1 ? buildTrendAreaPath(points, 100, 40) : '',
      }
      return acc
    }, {} as Record<WorkspaceSummaryPanelKey, { points: number[]; min: number; max: number; avg: number; last: number; path: string; areaPath: string }>)
  }, [summaryHistory, summaryRangeConfig])

  const persistPanelVisibility = useCallback(
    async (nextVisibility: Record<WorkspaceSummaryPanelKey, boolean>) => {
      setPanelVisibility(nextVisibility)
      if (!activeWorkspaceId) {
        return
      }
      try {
        await saveWorkspacePanelPreferences(activeWorkspaceId, {
          workspaceSummaryVisibility: nextVisibility,
        })
      } catch (err) {
        if (typeof window !== 'undefined') {
          console.warn('Failed to save workspace summary visibility.', err)
        }
      }
    },
    [activeWorkspaceId]
  )

  const handleSummaryPanelChange = useCallback(
    (nextSelected: string[]) => {
      const nextVisibility = WORKSPACE_SUMMARY_PANEL_KEYS.reduce((acc, key) => {
        acc[key] = nextSelected.includes(key)
        return acc
      }, {} as Record<WorkspaceSummaryPanelKey, boolean>)
      persistPanelVisibility(nextVisibility)
    },
    [persistPanelVisibility]
  )

  const handleSummaryRangeChange = useCallback(
    (range: SummaryRange) => {
      setSummaryRange(range)
      if (activeWorkspaceId) {
        writeSummaryRange(activeWorkspaceId, range)
      }
    },
    [activeWorkspaceId]
  )

  const moveChart = useCallback((sourceId: DashboardChartId, targetId: DashboardChartId) => {
    if (sourceId === targetId) return
    setChartOrder((prev) => {
      const sourceIndex = prev.indexOf(sourceId)
      const targetIndex = prev.indexOf(targetId)
      if (sourceIndex === -1 || targetIndex === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })
  }, [])

  const setChartRef = useCallback(
    (id: DashboardChartId) => (node: HTMLDivElement | null) => {
      chartRefs.current[id] = node
    },
    []
  )

  const chartCardStyle = useCallback(
    (id: DashboardChartId) => ({
      order: chartOrder.indexOf(id) + 1,
      height: `${chartHeights[id]}px`,
      gridRowEnd: `span ${chartRowSpans[id]}`,
    }),
    [chartHeights, chartOrder, chartRowSpans]
  )

  const handleChartResizeStart = useCallback(
    (id: DashboardChartId, edge: 'top' | 'bottom') =>
      (event: ReactMouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        const card = event.currentTarget.closest('.dashboard-user-chart') as HTMLElement | null
        const fallbackHeight = card?.getBoundingClientRect().height ?? 420
        setActiveChartResize({
          id,
          edge,
          startY: event.clientY,
          startHeight: chartHeights[id] ?? fallbackHeight,
        })
      },
    [chartHeights]
  )

  const handleChartDragStart = useCallback(
    (id: DashboardChartId) =>
      (event: DragEvent<HTMLElement>) => {
        setDraggingChart(id)
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData('text/plain', id)
      },
    []
  )

  const handleChartDragOver = useCallback(
    (targetId: DashboardChartId) =>
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setDragOverChart(targetId)
      },
    []
  )

  const handleChartDrop = useCallback(
    (targetId: DashboardChartId) =>
      (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        const sourceId = (event.dataTransfer.getData('text/plain') || draggingChart) as DashboardChartId | null
        if (sourceId && sourceId !== targetId) {
          moveChart(sourceId, targetId)
        }
        setDraggingChart(null)
        setDragOverChart(null)
      },
    [draggingChart, moveChart]
  )

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

  const hasAnyStatusFilterSelected = selectedProjectStatuses.size > 0 || unassignedFilterActive

  const selectedTeamSet = useMemo(() => {
    return new Set(
      selectedFilters
        .filter((value) => value.startsWith('team:'))
        .map((value) => value.replace('team:', ''))
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
        availableTeamIds.length > 0 && selectedTeamSet.size === availableTeamIds.length
      if (availableTeamIds.length === 0 || selectedTeamSet.size === 0 || allTeamsSelected) {
        return true
      }
      const projectTeamId = project.teamId ?? ''
      return projectTeamId ? selectedTeamSet.has(projectTeamId) : false
    },
    [selectedTeamSet, availableTeamIds]
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
      teamId: selectedProject.teamId ?? currentUser?.teamId ?? '',
      memberIds: selectedProject.memberIds ?? [],
    })
    setMemberSearch('')
    setAvailableSearch('')
  }, [selectedProject, currentUser?.teamId])

  useEffect(() => {
    let active = true
    setWorkspaceStatsError(null)
    if (!activeWorkspaceId) {
      setWorkspaceStats(null)
      return () => {
        active = false
      }
    }
    fetchDashboardStats(activeWorkspaceId)
      .then((data) => {
        if (active) {
          setWorkspaceStats(data)
        }
      })
      .catch((err) => {
        if (active) {
          setWorkspaceStatsError(err instanceof Error ? err.message : 'Failed to load workspace stats')
        }
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!activeWorkspaceId) {
      setPanelVisibility(buildPanelVisibility())
      return
    }
    let active = true
    fetchWorkspacePanelPreferences(activeWorkspaceId)
      .then((data) => {
        if (!active) return
        setPanelVisibility(buildPanelVisibility(data.workspaceSummaryVisibility))
      })
      .catch((err) => {
        if (!active) return
        if (typeof window !== 'undefined') {
          console.warn('Failed to load workspace summary visibility', err)
        }
        setPanelVisibility(buildPanelVisibility())
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!activeWorkspaceId) {
      setSummaryRange('24h')
      setSummaryHistory([])
      return
    }
    setSummaryRange(readSummaryRange(activeWorkspaceId))
    setSummaryHistory(compactSummaryHistory(readSummaryHistory(activeWorkspaceId)))
  }, [activeWorkspaceId])

  useEffect(() => {
    appendSummarySnapshot()
  }, [appendSummarySnapshot])

  useEffect(() => {
    if (!activeWorkspaceId) {
      return
    }
    const timer = window.setInterval(() => {
      appendSummarySnapshot()
    }, SUMMARY_SNAPSHOT_INTERVAL_MS)
    return () => {
      window.clearInterval(timer)
    }
  }, [activeWorkspaceId, appendSummarySnapshot])

  useEffect(() => {
    if (!activeChartResize) return
    const handleMouseMove = (event: MouseEvent) => {
      const delta = event.clientY - activeChartResize.startY
      const rawHeight =
        activeChartResize.edge === 'bottom'
          ? activeChartResize.startHeight + delta
          : activeChartResize.startHeight - delta
      const nextHeight = Math.max(DASHBOARD_CHART_MIN_HEIGHT, Math.min(DASHBOARD_CHART_MAX_HEIGHT, Math.round(rawHeight)))
      setChartHeights((prev) => ({ ...prev, [activeChartResize.id]: nextHeight }))
    }
    const handleMouseUp = () => setActiveChartResize(null)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [activeChartResize])

  useEffect(() => {
    const grid = document.querySelector('.dashboard-user-charts') as HTMLElement | null
    if (!grid) return
    const styles = window.getComputedStyle(grid)
    const rowHeight = Number.parseFloat(styles.getPropertyValue('grid-auto-rows')) || 8
    const rowGap = Number.parseFloat(styles.getPropertyValue('row-gap')) || 12
    const nextSpans: Record<DashboardChartId, number> = {
      projectsByStatus: 1,
      projectsByTeam: 1,
      workloadByTeam: 1,
      assignmentCoverage: 1,
    }
    DASHBOARD_CHART_ORDER_DEFAULT.forEach((id) => {
      const card = chartRefs.current[id]
      if (!card) return
      const height = card.getBoundingClientRect().height
      nextSpans[id] = Math.max(1, Math.ceil((height + rowGap) / (rowHeight + rowGap)))
    })
    setChartRowSpans((prev) => {
      const changed = DASHBOARD_CHART_ORDER_DEFAULT.some((id) => prev[id] !== nextSpans[id])
      return changed ? nextSpans : prev
    })
  }, [chartHeights, chartOrder, draggingChart, dragOverChart])

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
    const matchesSelectedStatus = selectedProjectStatuses.has(statusKey)
    const matchesUnassigned = unassignedFilterActive && memberCount === 0
    const statusMismatch = hasAnyStatusFilterSelected && !(matchesSelectedStatus || matchesUnassigned)
    const assignedToMeMismatch =
      assignedToMeOnly && currentUserId && !(match.memberIds ?? []).includes(currentUserId)
    if (statusMismatch || assignedToMeMismatch || !projectMatchesTeamFilter(match)) {
      onClearSelection()
    }
  }, [
    selectedProjectId,
    projects,
    selectedProjectStatuses,
    unassignedFilterActive,
    hasAnyStatusFilterSelected,
    assignedToMeOnly,
    currentUserId,
    projectMatchesTeamFilter,
    onClearSelection,
  ])

  useEffect(() => {
    if (!initializedTeamsRef.current && availableTeamIds.length > 0) {
      const allStatuses = PROJECT_FOLDERS.map((folder) => `status:${folder.key}`)
      const allTeams = availableTeamIds.map((teamId) => `team:${teamId}`)
      setSelectedFilters([...allStatuses, ...allTeams])
      initializedTeamsRef.current = true
    }
  }, [availableTeamIds])

  const defaultFilterKeys = useMemo(() => {
    const allStatuses = PROJECT_FOLDERS.map((folder) => `status:${folder.key}`)
    const allTeams = availableTeamIds.map((teamId) => `team:${teamId}`)
    return [...allStatuses, ...allTeams]
  }, [availableTeamIds])

  const handleFilterMenuChange = (next: string[]) => {
    setSelectedFilters(next)
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

  const handleStatusChange = async (project: Project, status: ProjectStatus) => {
    if (!project.id || !activeWorkspaceId) {
      return
    }
    setError(null)
    setUpdatingId(project.id)
    const payload: CreateProjectPayload = {
      name: (project.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
      description: project.description ?? undefined,
      status,
      teamId: project.teamId ?? currentUser?.teamId ?? '',
      memberIds: project.memberIds ?? [],
    }
    try {
      await updateProject(activeWorkspaceId, project.id, payload)
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
      teamId: overrides.teamId ?? (project.teamId ?? currentUser?.teamId ?? ''),
      memberIds: overrides.memberIds ?? (project.memberIds ?? []),
    }
  }

  const updateProjectStatus = async (project: Project, status: ProjectStatus) => {
    if (!project.id || !activeWorkspaceId) return
    await updateProject(activeWorkspaceId, project.id, buildProjectPayload(project, { status }))
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
    if (!project.id || !activeWorkspaceId) return
    try {
      await updateProject(
        activeWorkspaceId,
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
    if (!project.id || !activeWorkspaceId) return
    const confirmed = window.confirm('Delete this project permanently?')
    if (!confirmed) return
    try {
      await deleteProject(activeWorkspaceId, project.id)
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
    if (!selectedProject?.id || !draftProject || !activeWorkspaceId) {
      return
    }
    setError(null)
    setUpdatingId(selectedProject.id)
    try {
      await updateProject(activeWorkspaceId, selectedProject.id, {
        name: draftProject.name.trim().slice(0, MAX_PROJECT_TITLE_LENGTH),
        description: draftProject.description?.trim() || undefined,
        status: draftProject.status,
        teamId: draftProject.teamId ?? currentUser?.teamId ?? '',
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
    return users.filter((user) => user.id && !assignedIds.has(user.id) && !user.isAdmin)
  }, [users, draftProject])

  const scopedProjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return projects.filter((project) => {
      const statusKey = project.status ?? 'NOT_STARTED'
      const memberCount = (project.memberIds ?? []).length
      if (!hasAnyStatusFilterSelected) {
        return false
      }
      const matchesSelectedStatus = selectedProjectStatuses.has(statusKey)
      const matchesUnassigned = unassignedFilterActive && memberCount === 0
      if (!(matchesSelectedStatus || matchesUnassigned)) {
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
    hasAnyStatusFilterSelected,
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
        const teamId = teamByUserId.get(memberId ?? '')
        if (teamId) {
          projectTeams.add(teamId)
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
        const teamId = teamByUserId.get(memberId ?? '')
        if (!teamId) {
          return
        }
        if (selectedTeamSet.size > 0 && !selectedTeamSet.has(teamId)) {
          return
        }
        counts.set(teamId, (counts.get(teamId) ?? 0) + 1)
      })
    })
    return Array.from(counts.entries()).map(([team, value], index) => ({
      label: teamLabelByKey.get(team) ?? team,
      value,
      color: TEAM_COLORS[index % TEAM_COLORS.length],
    }))
  }, [scopedProjects, selectedTeamSet, teamByUserId, teamLabelByKey])

  const assignmentCoverageSlices = useMemo(() => {
    let assigned = 0
    let unassigned = 0
    scopedProjects.forEach((project) => {
      if ((project.memberIds ?? []).length > 0) {
        assigned += 1
      } else {
        unassigned += 1
      }
    })
    return [
      { label: 'Assigned', value: assigned, color: '#22c55e' },
      { label: 'Unassigned', value: unassigned, color: '#f97316' },
    ]
  }, [scopedProjects])

  const chartMetricsHealth = useMemo(() => {
    const scopedTotal = scopedProjects.length
    const statusTotal = statusSlices.reduce((sum, slice) => sum + slice.value, 0)
    const coverageTotal = assignmentCoverageSlices.reduce((sum, slice) => sum + slice.value, 0)
    const consistent = scopedTotal === statusTotal && scopedTotal === coverageTotal
    return {
      consistent,
      scopedTotal,
      statusTotal,
      coverageTotal,
    }
  }, [assignmentCoverageSlices, scopedProjects, statusSlices])

  const visibleProjects = scopedProjects

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
      <div className="panel-header dashboard-header-compact">
        <div>
          <h2>Dashboard</h2>
        </div>
        <ControlsBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search projects"
          filters={[]}
          filterSections={dashboardFilterSections}
          selectedFilterKeys={selectedFilters}
          onSelectedFilterKeysChange={handleFilterMenuChange}
          searchAriaLabel="Search projects"
          filterAriaLabel="Filter projects by status or team"
          filterActive={isFilterActive}
          searchOverlay
          filterBeforeSearch
          leadingActions={
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
          trailingActions={
            <>
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
            </>
          }
        />
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
            requireTeamOnCreate={requireTeamOnProjectCreate}
            onCreated={(created) => {
              setShowCreate(false)
              onCreated(created)
            }}
          />
        </div>
      ) : null}

      <div className="dashboard-split">
        <div className="dashboard-list">
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
                      const isRowUpdating = Boolean(project.id && updatingId === project.id)
                      return (
                        <li
                          key={project.id ?? project.name ?? 'project-' + folder.key + '-' + index}
                          className={`card project-row motion-card${isSelected ? ' selected' : ''}${isRowUpdating ? ' is-updating' : ''}`}
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
                            <div className="project-row-sub">
                              <div
                                className="project-row-description muted truncate"
                                title={formatMentionText(project.description ?? '') || 'No description'}
                              >
                                {project.description?.trim()
                                  ? <MentionText text={project.description} onMentionClick={(payload) => navigateFromMention(payload, navigate)} />
                                  : 'No description'}
                              </div>
                              {isArchived ? (
                                <span className="muted status-label-archived">Archived</span>
                              ) : (
                                <div className="project-status-wrap">
                                  <select
                                    className="status-select"
                                    value={status}
                                    onClick={(event) => event.stopPropagation()}
                                    onChange={(event) =>
                                      handleStatusChange(project, event.target.value as ProjectStatus)
                                    }
                                    disabled={isRowUpdating}
                                  >
                                    {PROJECT_STATUS_SELECTABLE.map((value) => (
                                      <option key={value} value={value}>
                                        {formatStatusLabel(value)}
                                      </option>
                                    ))}
                                  </select>
                                  {isRowUpdating ? <span className="project-inline-loading">Saving...</span> : null}
                                </div>
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
                  <div className="details-header-main">
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
                    <MentionTextarea
                      className="details-description"
                      value={draftProject?.description ?? ''}
                      onChange={(nextValue) => draftProject && setDraftProject({ ...draftProject, description: nextValue })}
                      rows={2}
                      placeholder="Add a description"
                      disabled={selectedIsArchived}
                      options={mentionOptions}
                    />
                  </div>
                  <div className="details-header-side">
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
                    {selectedProject?.createdByName || selectedProject?.createdByUserId ? (
                      <div
                        className="muted details-created-by"
                        title={`Created by ${
                          selectedProject.createdByName ?? selectedProject.createdByUserId ?? 'Unknown'
                        }${
                          selectedProject.teamName || selectedProject.createdByTeam
                            ? ` (${selectedProject.teamName ?? selectedProject.createdByTeam})`
                            : ''
                        }`}
                      >
                        Created by {selectedProject.createdByName ?? selectedProject.createdByUserId}
                      </div>
                    ) : null}
                  </div>
                </div>
                {!selectedIsArchived ? (
                  <>
                    <div className="members-editor">
                      <div className="card member-panel-card">
                        <div className="member-panel-head">
                          <h4>Members in this project</h4>
                          <input
                            type="search"
                            placeholder="Search members"
                            value={memberSearch}
                            onChange={(event) => setMemberSearch(event.target.value)}
                          />
                        </div>
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
                      <div className="card member-panel-card">
                        <div className="member-panel-head">
                          <h4>Assign people</h4>
                          <input
                            type="search"
                            placeholder="Search people"
                            value={availableSearch}
                            onChange={(event) => setAvailableSearch(event.target.value)}
                          />
                        </div>
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
                      <ProjectComments projectId={selectedProject.id} currentUser={currentUser} mentionUsers={users} />
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
                <div className="card workspace-summary-card">
                  <div className="panel-header">
                    <h4>Workspace summary</h4>
                    <FilterMenu
                      ariaLabel="Workspace summary visibility"
                      sections={[
                        {
                          label: 'Panels',
                          options: SUMMARY_PANELS.map((panel) => ({
                            id: panel.key,
                            label: panel.label,
                          })),
                        },
                      ]}
                      selected={summarySelectedKeys}
                      onChange={handleSummaryPanelChange}
                      isActive={
                        summarySelectedKeys.length > 0 && summarySelectedKeys.length < SUMMARY_PANELS.length
                      }
                      buttonClassName="workspace-summary-button"
                      icon={<SummaryMenuIcon />}
                      extraContent={
                        <div className="filter-extra-row">
                          <label htmlFor="dashboard-summary-range">Range</label>
                          <select
                            id="dashboard-summary-range"
                            value={summaryRange}
                            onChange={(event) => handleSummaryRangeChange(event.target.value as SummaryRange)}
                          >
                            {SUMMARY_RANGE_OPTIONS.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      }
                    />
                  </div>
                  {workspaceStatsError ? <p className="error">{workspaceStatsError}</p> : null}
                  <div className="workspace-summary-panels">
                    {visiblePanels.length === 0 ? (
                      <p className="muted">
                        All panels are hidden. Use the toggles above to show at least one summary panel.
                      </p>
                    ) : (
                      visiblePanels.map((panel) => (
                        <div key={panel.key} className="workspace-summary-panel">
                          <div className="workspace-summary-chart-bg" aria-hidden="true">
                            <svg viewBox="0 0 100 40" preserveAspectRatio="none">
                              {summaryTrendData[panel.key]?.areaPath ? (
                                <path className="workspace-summary-chart-area" d={summaryTrendData[panel.key].areaPath} />
                              ) : null}
                              {summaryTrendData[panel.key]?.path ? (
                                <path className="workspace-summary-chart-line" d={summaryTrendData[panel.key].path} />
                              ) : null}
                            </svg>
                            <span className="workspace-summary-axis workspace-summary-axis-top">
                              {summaryTrendData[panel.key]?.max ?? 0}
                            </span>
                            <span className="workspace-summary-axis workspace-summary-axis-bottom">
                              {summaryTrendData[panel.key]?.min ?? 0}
                            </span>
                            <span className="workspace-summary-axis workspace-summary-axis-range">{summaryRange}</span>
                          </div>
                          <span className="muted">{panel.label}</span>
                          <strong>{getPanelValue(panel.key)}</strong>
                          <span className="workspace-summary-description">{panel.description}</span>
                          <div className="workspace-summary-metrics">
                            <span>{SUMMARY_PANEL_MEASURE_LABEL[panel.key]}: {summaryTrendData[panel.key]?.last ?? 0}</span>
                            <span>Avg: {Math.round(summaryTrendData[panel.key]?.avg ?? 0)}</span>
                            <span>Peak: {summaryTrendData[panel.key]?.max ?? 0}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                {!chartMetricsHealth.consistent ? (
                  <div className="banner error" role="alert">
                    Stats mismatch detected: projects={chartMetricsHealth.scopedTotal}, status total=
                    {chartMetricsHealth.statusTotal}, coverage total={chartMetricsHealth.coverageTotal}.
                  </div>
                ) : null}
                <div className="dashboard-user-charts">
                  {chartOrder.map((chartId) => {
                    const meta =
                      chartId === 'projectsByStatus'
                        ? {
                            title: 'Projects by status',
                            tooltip: undefined,
                            data: statusSlices,
                          }
                        : chartId === 'projectsByTeam'
                          ? {
                              title: 'Projects by team',
                              tooltip: 'Projects with at least one member in the team',
                              data: projectsByTeamSlices,
                            }
                          : chartId === 'workloadByTeam'
                            ? {
                                title: 'People workload by team',
                                tooltip: 'Active assignments for team members (Not Started + In Progress)',
                                data: workloadByTeamSlices,
                              }
                            : {
                                title: 'Assignment coverage',
                                tooltip: 'Share of projects with members vs unassigned projects',
                                data: assignmentCoverageSlices,
                              }
                    return (
                      <div
                        key={chartId}
                        ref={setChartRef(chartId)}
                        className={`card stats-card dashboard-user-chart${dragOverChart === chartId ? ' is-drop-target' : ''}`}
                        style={chartCardStyle(chartId)}
                        onDragOver={handleChartDragOver(chartId)}
                        onDrop={handleChartDrop(chartId)}
                        onDragLeave={() => setDragOverChart((prev) => (prev === chartId ? null : prev))}
                      >
                        <div className="dashboard-chart-resize-handle top" onMouseDown={handleChartResizeStart(chartId, 'top')} />
                        <div className="dashboard-chart-header">
                          <h4 title={meta.tooltip}>{meta.title}</h4>
                          <span
                            className="settings-drag-icon"
                            draggable
                            onDragStart={handleChartDragStart(chartId)}
                            onDragEnd={() => {
                              setDraggingChart(null)
                              setDragOverChart(null)
                            }}
                            title="Drag to reorder"
                            aria-label={`Drag ${meta.title} chart`}
                          >
                            ⋮⋮
                          </span>
                        </div>
                        <PieChart data={meta.data} />
                        <div className="dashboard-chart-resize-handle bottom" onMouseDown={handleChartResizeStart(chartId, 'bottom')} />
                      </div>
                    )
                  })}
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
