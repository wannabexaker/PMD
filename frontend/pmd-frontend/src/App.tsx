import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type { LoginPayload, Project, RegisterPayload, RegisterResponse, User, UserSummary } from './types'
import { fetchUsers } from './api/users'
import { fetchProjects } from './api/projects'
import { fetchMe, login, logoutSession, refreshSession, register } from './api/auth'
import { API_BASE_URL, getAuthToken, isApiError } from './api/http'
import { DashboardPage } from './components/DashboardPage'
import { AssignPage } from './components/AssignPage'
import { PeoplePage } from './components/PeoplePage'
import { AdminPanel } from './components/AdminPanel'
import { ConfirmEmailPage } from './components/ConfirmEmailPage'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'
import { ProfilePanel } from './components/ProfilePanel'
import { SettingsPage } from './components/SettingsPage'
import { Logo } from './components/Logo'
import { ThemeToggle } from './components/ThemeToggle'
import { PmdLoader } from './components/common/PmdLoader'
import { getAuthNotification } from './auth/authNotificationMatrix'
import { TeamsProvider } from './teams/TeamsContext'
import { WorkspaceProvider, useWorkspace } from './workspaces/WorkspaceContext'
import { loadUiPreferences, saveUiPreferences } from './ui/uiPreferences'
import {
  clearAssignSelectedProjectId,
  clearDashboardSelectedProjectId,
  clearPeopleSelection,
  clearUiSelections,
  getAssignSelectedProjectId,
  getDashboardSelectedProjectId,
  setAssignSelectedProjectId,
  setDashboardSelectedProjectId,
} from './ui/uiSelectionStore'
import { getAvatarFrameStyle } from './shared/avatarFrame'
import './App.css'

function toLandingPath(preferences: ReturnType<typeof loadUiPreferences>) {
  switch (preferences.defaultLandingPage) {
    case 'assign':
      return '/assign'
    case 'people':
      return '/people'
    case 'settings':
      return '/settings'
    case 'lastVisited':
      return '/dashboard'
    default:
      return '/dashboard'
  }
}

const LAST_APP_ROUTE_KEY = 'pmd.lastAppRoute'
const ROUTE_MEMORY_ALLOWLIST = new Set(['/dashboard', '/assign', '/people', '/settings', '/profile', '/admin'])
const THEME_KEY = 'pmd.theme'
const ONBOARDING_TOUR_KEY_PREFIX = 'pmd.onboardingTour.v1.'

type OnboardingTourStep = {
  id: string
  title: string
  description: string
  route?: '/dashboard' | '/settings'
  selector?: string
}

const ONBOARDING_TOUR_STEPS: OnboardingTourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to PMD',
    description:
      'This quick tour shows where profile, workspace controls, and setup actions are located.',
  },
  {
    id: 'workspace-switcher',
    title: 'Active workspace',
    description: 'Use this selector to switch the workspace you are currently working in.',
    selector: '[data-tour="workspace-switcher"]',
  },
  {
    id: 'profile',
    title: 'Your profile',
    description: 'Open your profile from here to update personal details and profile picture.',
    selector: '[data-tour="profile-button"]',
  },
  {
    id: 'settings-entry',
    title: 'Workspace settings',
    description: 'Use this workspace icon to open Settings directly for workspace management.',
    selector: '[data-tour="workspace-settings-button"]',
  },
  {
    id: 'settings-workspaces',
    title: 'Workspaces card',
    description: 'This section contains workspace management, invite flow, and approvals.',
    route: '/settings',
    selector: '[data-tour="settings-workspaces-card"]',
  },
  {
    id: 'create-workspace',
    title: 'Create workspace',
    description: 'Create a new workspace here when you need a separate environment.',
    route: '/settings',
    selector: '[data-tour="settings-create-workspace"]',
  },
  {
    id: 'join-workspace',
    title: 'Join workspace',
    description: 'Use an invite token or link here to join another workspace.',
    route: '/settings',
    selector: '[data-tour="settings-join-workspace"]',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    description: 'Track project status and progress from the dashboard cards and metrics.',
    route: '/dashboard',
    selector: '[data-tour="dashboard-page"]',
  },
]

function readLastAppRoute() {
  if (typeof window === 'undefined') return null
  const stored = window.localStorage.getItem(LAST_APP_ROUTE_KEY)
  return stored && ROUTE_MEMORY_ALLOWLIST.has(stored) ? stored : null
}

function writeLastAppRoute(pathname: string) {
  if (typeof window === 'undefined') return
  if (!ROUTE_MEMORY_ALLOWLIST.has(pathname)) return
  window.localStorage.setItem(LAST_APP_ROUTE_KEY, pathname)
}

function readStoredTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(THEME_KEY)
  return stored === 'light' ? 'light' : 'dark'
}

function App() {
  return <AppStateful />
}

function AppStateful() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => readStoredTheme())
  const [menuOpen, setMenuOpen] = useState(false)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [projectLoading, setProjectLoading] = useState(true)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [dashboardSelectedProjectId, setDashboardSelectedProjectIdState] = useState<string | null>(() => {
    const prefs = loadUiPreferences()
    return prefs.rememberDashboardProject ? getDashboardSelectedProjectId() : null
  })
  const [assignSelectedProjectId, setAssignSelectedProjectIdState] = useState<string | null>(() => {
    const prefs = loadUiPreferences()
    return prefs.rememberAssignProject ? getAssignSelectedProjectId() : null
  })
  const [uiPreferences, setUiPreferences] = useState(() => loadUiPreferences())
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('online')
  const [backendMessage, setBackendMessage] = useState<string | null>(null)

  return (
    <AuthProvider user={currentUser}>
      <WorkspaceProvider>
        <TeamsProvider user={currentUser}>
          <AppView
            currentUser={currentUser}
            setCurrentUser={setCurrentUser}
            authLoading={authLoading}
            setAuthLoading={setAuthLoading}
            authError={authError}
            setAuthError={setAuthError}
            theme={theme}
            setTheme={setTheme}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            users={users}
            setUsers={setUsers}
            projects={projects}
            setProjects={setProjects}
            usersLoading={usersLoading}
            setUsersLoading={setUsersLoading}
            projectLoading={projectLoading}
            setProjectLoading={setProjectLoading}
            usersError={usersError}
            setUsersError={setUsersError}
            projectError={projectError}
            setProjectError={setProjectError}
            dashboardSelectedProjectId={dashboardSelectedProjectId}
            setDashboardSelectedProjectIdState={setDashboardSelectedProjectIdState}
            assignSelectedProjectId={assignSelectedProjectId}
            setAssignSelectedProjectIdState={setAssignSelectedProjectIdState}
            uiPreferences={uiPreferences}
            setUiPreferences={setUiPreferences}
            backendStatus={backendStatus}
            setBackendStatus={setBackendStatus}
            backendMessage={backendMessage}
            setBackendMessage={setBackendMessage}
          />
        </TeamsProvider>
      </WorkspaceProvider>
    </AuthProvider>
  )
}

type AppViewProps = {
  currentUser: User | null
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>
  authLoading: boolean
  setAuthLoading: React.Dispatch<React.SetStateAction<boolean>>
  authError: string | null
  setAuthError: React.Dispatch<React.SetStateAction<string | null>>
  theme: 'dark' | 'light'
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>
  menuOpen: boolean
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>
  users: UserSummary[]
  setUsers: React.Dispatch<React.SetStateAction<UserSummary[]>>
  projects: Project[]
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  usersLoading: boolean
  setUsersLoading: React.Dispatch<React.SetStateAction<boolean>>
  projectLoading: boolean
  setProjectLoading: React.Dispatch<React.SetStateAction<boolean>>
  usersError: string | null
  setUsersError: React.Dispatch<React.SetStateAction<string | null>>
  projectError: string | null
  setProjectError: React.Dispatch<React.SetStateAction<string | null>>
  dashboardSelectedProjectId: string | null
  setDashboardSelectedProjectIdState: React.Dispatch<React.SetStateAction<string | null>>
  assignSelectedProjectId: string | null
  setAssignSelectedProjectIdState: React.Dispatch<React.SetStateAction<string | null>>
  uiPreferences: ReturnType<typeof loadUiPreferences>
  setUiPreferences: React.Dispatch<React.SetStateAction<ReturnType<typeof loadUiPreferences>>>
  backendStatus: 'online' | 'offline'
  setBackendStatus: React.Dispatch<React.SetStateAction<'online' | 'offline'>>
  backendMessage: string | null
  setBackendMessage: React.Dispatch<React.SetStateAction<string | null>>
}

function AppView({
  currentUser,
  setCurrentUser,
  authLoading,
  setAuthLoading,
  authError,
  setAuthError,
  theme,
  setTheme,
  menuOpen,
  setMenuOpen,
  users,
  setUsers,
  projects,
  setProjects,
  usersLoading,
  setUsersLoading,
  projectLoading,
  setProjectLoading,
  usersError,
  setUsersError,
  projectError,
  setProjectError,
  dashboardSelectedProjectId,
  setDashboardSelectedProjectIdState,
  assignSelectedProjectId,
  setAssignSelectedProjectIdState,
  uiPreferences,
  setUiPreferences,
  backendStatus,
  setBackendStatus,
  backendMessage,
  setBackendMessage,
}: AppViewProps) {
  const {
    activeWorkspaceId,
    activeWorkspace,
    workspaces,
    loading: workspaceLoading,
    error: workspaceError,
    setActiveWorkspaceId,
  } = useWorkspace()
  const location = useLocation()
  const navigate = useNavigate()
  const previousPathRef = useRef<string>(location.pathname)
  const previousWorkspaceIdRef = useRef<string | null>(activeWorkspaceId ?? null)
  const isAuthed = Boolean(currentUser)
  const isAdmin = Boolean(currentUser?.isAdmin)
  const isAssignRoute = location.pathname === '/assign'
  const isSettingsRoute = location.pathname === '/settings'
  const isPeopleRoute = location.pathname === '/people'
  const isDashboardRoute = location.pathname === '/dashboard'
  const backendOffline = backendStatus === 'offline'
  const hasWorkspace = Boolean(activeWorkspaceId)
  const workspaceRequired = isAuthed && !hasWorkspace && !workspaceLoading && !workspaceError
  const landingPath = toLandingPath(uiPreferences)
  const preferredAuthedRoute =
    uiPreferences.defaultLandingPage === 'lastVisited' ? (readLastAppRoute() ?? '/dashboard') : landingPath
  const onboardingKey = currentUser?.id ? `${ONBOARDING_TOUR_KEY_PREFIX}${currentUser.id}` : null
  const [tourOpen, setTourOpen] = useState(false)
  const [tourStepIndex, setTourStepIndex] = useState(0)
  const [tourHighlightRect, setTourHighlightRect] = useState<DOMRect | null>(null)
  const [tourCardPosition, setTourCardPosition] = useState<{ top: number; left: number } | null>(null)
  const tourCardRef = useRef<HTMLDivElement | null>(null)
  const activeTourStep = tourOpen ? ONBOARDING_TOUR_STEPS[tourStepIndex] : null
  const resolveAssetUrl = useCallback((url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const prefix = url.startsWith('/') ? '' : '/'
    return `${API_BASE_URL}${prefix}${url}`
  }, [])

  const loadMe = useCallback(async () => {
    setAuthError(null)
    setAuthLoading(true)
    let token = getAuthToken()
    if (!token) {
      const refreshed = await refreshSession()
      token = refreshed?.token ?? null
      if (refreshed?.user) {
        setCurrentUser(refreshed.user)
      }
    }
    if (!token) {
        setCurrentUser(null)
        setAuthLoading(false)
        return
    }
    const user = await fetchMe()
    setCurrentUser(user)
    setAuthLoading(false)
  }, [setAuthError, setAuthLoading, setCurrentUser])

  const loadUsers = useCallback(async () => {
    if (!activeWorkspaceId) {
      setUsers([])
      setUsersLoading(false)
      setUsersError(null)
      return
    }
    setUsersError(null)
    setUsersLoading(true)
    try {
      const data = await fetchUsers(activeWorkspaceId)
      setUsers(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      setUsersError(message === 'Not Found' ? 'Unable to load users.' : message)
      if (isApiError(err) && err.status === 0) {
        setUsers([])
      }
    } finally {
      setUsersLoading(false)
    }
  }, [activeWorkspaceId, setUsers, setUsersError, setUsersLoading])

  const loadProjects = useCallback(async (options?: { background?: boolean }) => {
    const background = Boolean(options?.background)
    if (!activeWorkspaceId) {
      setProjects([])
      setProjectLoading(false)
      setProjectError(null)
      return
    }
    setProjectError(null)
    if (!background) {
      setProjectLoading(true)
    }
    try {
      const data = await fetchProjects(activeWorkspaceId)
      setProjects(data)
      if (dashboardSelectedProjectId && !data.some((project) => project.id === dashboardSelectedProjectId)) {
        setDashboardSelectedProjectIdState(null)
      }
      if (assignSelectedProjectId && !data.some((project) => project.id === assignSelectedProjectId)) {
        setAssignSelectedProjectIdState(null)
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to load projects')
      if (isApiError(err) && err.status === 0) {
        setProjects([])
        setDashboardSelectedProjectIdState(null)
        setAssignSelectedProjectIdState(null)
      }
    } finally {
      if (!background) {
        setProjectLoading(false)
      }
    }
  }, [
    activeWorkspaceId,
    assignSelectedProjectId,
    dashboardSelectedProjectId,
    setAssignSelectedProjectIdState,
    setDashboardSelectedProjectIdState,
    setProjectError,
    setProjectLoading,
    setProjects,
  ])

  const refreshProjectsBackground = useCallback(async () => {
    await loadProjects({ background: true })
  }, [loadProjects])

  const handleProjectCreated = useCallback(
    (project?: Project) => {
      if (project?.id) {
        setProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)])
      }
      refreshProjectsBackground()
    },
    [refreshProjectsBackground, setProjects]
  )

  useEffect(() => {
    saveUiPreferences(uiPreferences)
  }, [uiPreferences])

  useEffect(() => {
    if (uiPreferences.rememberDashboardProject) {
      if (!dashboardSelectedProjectId) {
        const stored = getDashboardSelectedProjectId()
        if (stored) {
          setDashboardSelectedProjectIdState(stored)
        }
      }
      setDashboardSelectedProjectId(dashboardSelectedProjectId)
    } else {
      clearDashboardSelectedProjectId()
    }
  }, [dashboardSelectedProjectId, uiPreferences.rememberDashboardProject, setDashboardSelectedProjectIdState])

  useEffect(() => {
    if (uiPreferences.rememberAssignProject) {
      if (!assignSelectedProjectId) {
        const stored = getAssignSelectedProjectId()
        if (stored) {
          setAssignSelectedProjectIdState(stored)
        }
      }
      setAssignSelectedProjectId(assignSelectedProjectId)
    } else {
      clearAssignSelectedProjectId()
    }
  }, [assignSelectedProjectId, uiPreferences.rememberAssignProject, setAssignSelectedProjectIdState])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    document.body.dataset.theme = theme
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_KEY, theme)
    }
  }, [theme])

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null)
      localStorage.removeItem('pmd.activeWorkspaceId')
      localStorage.removeItem('pmd:lastWorkspaceId')
      localStorage.removeItem('pmd_active_workspace_id')
      setDashboardSelectedProjectIdState(null)
      setAssignSelectedProjectIdState(null)
      clearUiSelections()
      setActiveWorkspaceId(null)
      navigate('/login')
    }
    window.addEventListener('pmd:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('pmd:unauthorized', handleUnauthorized)
    }
  }, [navigate, setActiveWorkspaceId, setAssignSelectedProjectIdState, setCurrentUser, setDashboardSelectedProjectIdState])

  useEffect(() => {
    const handleOffline = (event: Event) => {
      const detail = event instanceof CustomEvent ? (event.detail as { baseUrl?: string }) : undefined
      const baseUrl = detail?.baseUrl ?? API_BASE_URL
      setBackendStatus('offline')
      setBackendMessage(`Backend unreachable at ${baseUrl}.`)
      setUsers([])
      setProjects([])
      setDashboardSelectedProjectIdState(null)
      setAssignSelectedProjectIdState(null)
      clearUiSelections()
      setUsersLoading(false)
      setProjectLoading(false)
      setUsersError(`Cannot reach server (${baseUrl}).`)
      setProjectError(`Cannot reach server (${baseUrl}).`)
    }
    const handleOnline = () => {
      setBackendStatus('online')
      setBackendMessage(null)
      if (currentUser && activeWorkspaceId) {
        loadUsers()
        loadProjects()
      }
    }
    window.addEventListener('pmd:offline', handleOffline)
    window.addEventListener('pmd:online', handleOnline)
    return () => {
      window.removeEventListener('pmd:offline', handleOffline)
      window.removeEventListener('pmd:online', handleOnline)
    }
  }, [
    activeWorkspaceId,
    currentUser,
    loadProjects,
    loadUsers,
    setAssignSelectedProjectIdState,
    setBackendMessage,
    setBackendStatus,
    setDashboardSelectedProjectIdState,
    setProjectError,
    setProjectLoading,
    setProjects,
    setUsers,
    setUsersError,
    setUsersLoading,
  ])

  useEffect(() => {
    const handleWorkspaceReset = () => {
      if (currentUser && activeWorkspaceId) {
        loadUsers()
        loadProjects()
      }
    }
    window.addEventListener('pmd:workspace-reset', handleWorkspaceReset)
    return () => {
      window.removeEventListener('pmd:workspace-reset', handleWorkspaceReset)
    }
  }, [activeWorkspaceId, currentUser, loadProjects, loadUsers])

  useEffect(() => {
    setMenuOpen(false)
    setAuthError(null)
  }, [location.pathname, setAuthError, setMenuOpen])

  useEffect(() => {
    const previousPath = previousPathRef.current
    if (previousPath !== location.pathname) {
      if (previousPath === '/dashboard' && !uiPreferences.rememberDashboardProject) {
        setDashboardSelectedProjectIdState(null)
        clearDashboardSelectedProjectId()
      }
      if (previousPath === '/assign' && !uiPreferences.rememberAssignProject) {
        setAssignSelectedProjectIdState(null)
        clearAssignSelectedProjectId()
      }
      if (previousPath === '/people' && !uiPreferences.rememberPeopleSelection) {
        clearPeopleSelection()
      }
    }
    previousPathRef.current = location.pathname
  }, [location.pathname, uiPreferences, setAssignSelectedProjectIdState, setDashboardSelectedProjectIdState])

  useEffect(() => {
    if (!isAuthed) {
      return
    }
    writeLastAppRoute(location.pathname)
  }, [isAuthed, location.pathname])

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = ''
      return
    }
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen, setMenuOpen])

  useEffect(() => {
    const previousWorkspaceId = previousWorkspaceIdRef.current
    if (previousWorkspaceId === activeWorkspaceId) {
      return
    }
    previousWorkspaceIdRef.current = activeWorkspaceId ?? null
    setUsers([])
    setProjects([])
    setUsersError(null)
    setProjectError(null)
    setDashboardSelectedProjectIdState(null)
    setAssignSelectedProjectIdState(null)
    clearUiSelections()
    const shouldLoad = Boolean(currentUser && activeWorkspaceId)
    setUsersLoading(shouldLoad)
    setProjectLoading(shouldLoad)
  }, [
    activeWorkspaceId,
    currentUser,
    setAssignSelectedProjectIdState,
    setDashboardSelectedProjectIdState,
    setProjectError,
    setProjectLoading,
    setProjects,
    setUsers,
    setUsersError,
    setUsersLoading,
  ])

  useEffect(() => {
    if (!currentUser || !activeWorkspaceId) {
      return
    }
    loadUsers()
    loadProjects()
  }, [currentUser, activeWorkspaceId, loadUsers, loadProjects])

  useEffect(() => {
    if (!currentUser || activeWorkspaceId) {
      return
    }
    setUsers([])
    setProjects([])
    setUsersLoading(false)
    setProjectLoading(false)
  }, [currentUser, activeWorkspaceId, setProjects, setProjectLoading, setUsers, setUsersLoading])

  const handleLogin = async (payload: LoginPayload) => {
    setAuthError(null)
    try {
      setAuthLoading(true)
      const response = await login(payload)
      setCurrentUser(response.user ?? null)
      setDashboardSelectedProjectIdState(null)
      setAssignSelectedProjectIdState(null)
      clearUiSelections()
      navigate(landingPath)
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          setAuthError(getAuthNotification('login_invalid_credentials').message)
        } else if (err.status === 403) {
          const reason = (err.message || '').toLowerCase()
          if (reason.includes('email verification required')) {
            setAuthError('Email verification required. Please confirm your email first.')
          } else {
            setAuthError(getAuthNotification('login_access_denied').message)
          }
        } else if (err.status >= 500) {
          setAuthError(getAuthNotification('login_server_error').message)
        } else if (err.status === 0) {
          const base = getAuthNotification('login_network_error').message
          setAuthError(`${base} (${API_BASE_URL}).`)
        } else {
          setAuthError(err.message)
        }
      } else {
        setAuthError(err instanceof Error ? err.message : 'Login failed')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleRegister = async (payload: RegisterPayload): Promise<RegisterResponse> => {
    setAuthError(null)
    try {
      setAuthLoading(true)
      return await register(payload)
    } catch (err) {
      let message = 'Registration failed'
      if (isApiError(err)) {
        if (err.status === 409) {
          message = getAuthNotification('register_conflict').message
        } else if (err.status === 400 || err.status === 422) {
          message = err.message || getAuthNotification('register_validation_error').message
        } else if (err.status >= 500) {
          message = getAuthNotification('register_server_error').message
        } else if (err.status === 0) {
          const base = getAuthNotification('register_network_error').message
          message = `${base} (${API_BASE_URL}).`
        } else {
          message = err.message || message
        }
      } else {
        message = err instanceof Error ? err.message : message
      }
      setAuthError(message)
      throw new Error(message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    void logoutSession()
    localStorage.removeItem('pmd.activeWorkspaceId')
    localStorage.removeItem('pmd:lastWorkspaceId')
    localStorage.removeItem('pmd_active_workspace_id')
    setCurrentUser(null)
    setDashboardSelectedProjectIdState(null)
    setAssignSelectedProjectIdState(null)
    clearUiSelections()
    setActiveWorkspaceId(null)
    navigate('/login')
  }

  const handleProfileSaved = (user: User) => {
    setCurrentUser(user)
  }

  const handlePreferencesChange = (next: typeof uiPreferences) => {
    setUiPreferences(next)
    if (!next.rememberDashboardProject) {
      setDashboardSelectedProjectIdState(null)
      clearDashboardSelectedProjectId()
    }
    if (!next.rememberAssignProject) {
      setAssignSelectedProjectIdState(null)
      clearAssignSelectedProjectId()
    }
    if (!next.rememberPeopleSelection) {
      clearPeopleSelection()
    }
  }

  const completeTour = useCallback(() => {
    if (onboardingKey) {
      window.localStorage.setItem(onboardingKey, 'done')
    }
    setTourOpen(false)
    setTourHighlightRect(null)
    setTourStepIndex(0)
  }, [onboardingKey])

  const nextTourStep = useCallback(() => {
    setTourStepIndex((prev) => {
      if (prev >= ONBOARDING_TOUR_STEPS.length - 1) {
        completeTour()
        return prev
      }
      return prev + 1
    })
  }, [completeTour])

  const prevTourStep = useCallback(() => {
    setTourStepIndex((prev) => Math.max(0, prev - 1))
  }, [])

  const noWorkspaceState = (
    <section className="panel">
      <h2>No workspace selected</h2>
      <p className="muted">Select or join a workspace from Settings to continue.</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/settings')}>
          Open Settings
        </button>
      </div>
    </section>
  )

  useEffect(() => {
    if (!isAuthed || !currentUser?.id || !onboardingKey) return
    const alreadyDone = window.localStorage.getItem(onboardingKey) === 'done'
    if (!alreadyDone) {
      setTourStepIndex(0)
      setTourOpen(true)
    }
  }, [currentUser?.id, isAuthed, onboardingKey])

  useEffect(() => {
    if (!tourOpen || !activeTourStep?.route) return
    if (location.pathname !== activeTourStep.route) {
      navigate(activeTourStep.route)
    }
  }, [activeTourStep?.route, location.pathname, navigate, tourOpen])

  useEffect(() => {
    if (!tourOpen || !activeTourStep?.selector) {
      setTourHighlightRect(null)
      return
    }
    const selector = activeTourStep.selector
    const refreshRect = () => {
      const element = document.querySelector(selector) as HTMLElement | null
      if (!element) {
        setTourHighlightRect(null)
        return
      }
      setTourHighlightRect(element.getBoundingClientRect())
    }
    const timer = window.setTimeout(() => {
      const element = document.querySelector(selector) as HTMLElement | null
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      }
      refreshRect()
    }, 80)
    refreshRect()
    window.addEventListener('resize', refreshRect)
    window.addEventListener('scroll', refreshRect, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('resize', refreshRect)
      window.removeEventListener('scroll', refreshRect, true)
    }
  }, [activeTourStep?.id, activeTourStep?.selector, location.pathname, tourOpen])

  useEffect(() => {
    if (!tourOpen) {
      setTourCardPosition(null)
      return
    }
    const positionCard = () => {
      const card = tourCardRef.current
      if (!card) {
        return
      }
      const cardRect = card.getBoundingClientRect()
      const margin = 16
      const gap = 14

      let left = window.innerWidth - cardRect.width - margin
      let top = window.innerHeight - cardRect.height - margin

      if (tourHighlightRect) {
        const spaceBelow = window.innerHeight - (tourHighlightRect.bottom + gap + margin)
        const spaceAbove = tourHighlightRect.top - gap - margin
        const placeBelow = spaceBelow >= cardRect.height || spaceBelow >= spaceAbove

        top = placeBelow
          ? tourHighlightRect.bottom + gap
          : tourHighlightRect.top - cardRect.height - gap
        left = tourHighlightRect.left + (tourHighlightRect.width / 2) - (cardRect.width / 2)
      }

      left = Math.max(margin, Math.min(left, window.innerWidth - cardRect.width - margin))
      top = Math.max(margin, Math.min(top, window.innerHeight - cardRect.height - margin))

      const next = { top: Math.round(top), left: Math.round(left) }
      setTourCardPosition((prev) => {
        if (prev && prev.top === next.top && prev.left === next.left) {
          return prev
        }
        return next
      })
    }

    const raf = window.requestAnimationFrame(positionCard)
    window.addEventListener('resize', positionCard)
    window.addEventListener('scroll', positionCard, true)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', positionCard)
      window.removeEventListener('scroll', positionCard, true)
    }
  }, [activeTourStep?.id, location.pathname, tourHighlightRect, tourOpen, tourStepIndex])

  if (authLoading) {
    return (
      <div className="container">
        <PmdLoader size="lg" variant="fullscreen" label="Loading..." />
      </div>
    )
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="brand brand-link"
            onClick={() => {
              if (!isAuthed) {
                navigate('/login')
                return
              }
              if (workspaceRequired) {
                navigate('/settings')
                return
              }
              navigate('/dashboard')
            }}
            aria-label="Go to dashboard"
          >
            <Logo size={26} />
          </button>
          <div className="topbar-actions">
            {isAuthed ? (
              <div className="topbar-identities">
                <div className="identity-pill workspace-identity">
                  {activeWorkspaceId ? (
                    <div className="avatar-menu">
                      <button
                        type="button"
                        className="workspace-avatar avatar-button"
                        data-tour="workspace-settings-button"
                        title={activeWorkspace?.name ?? 'Workspace settings'}
                        onClick={() => navigate('/settings')}
                      >
                        {activeWorkspace?.avatarUrl ? (
                          <img
                            src={resolveAssetUrl(activeWorkspace.avatarUrl)}
                            alt=""
                            className="framed-avatar-image"
                            style={getAvatarFrameStyle(activeWorkspace.avatarUrl)}
                            draggable={false}
                            onContextMenu={(event) => event.preventDefault()}
                          />
                        ) : (
                          <span>{(activeWorkspace?.name ?? 'W').slice(0, 1).toUpperCase()}</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="workspace-avatar" aria-hidden="true">
                      W
                    </span>
                  )}
                  <div className="workspace-switcher">
                    <select
                      data-tour="workspace-switcher"
                      aria-label="Active workspace"
                      value={activeWorkspaceId ?? ''}
                      onChange={(event) => setActiveWorkspaceId(event.target.value || null)}
                    >
                      <option value="" disabled>
                        Select workspace
                      </option>
                      {workspaces.map((workspace) => {
                        const name = workspace.name ?? 'Workspace'
                        const pending = workspace.status === 'PENDING'
                        return (
                          <option
                            key={workspace.id ?? workspace.name}
                            value={workspace.id ?? ''}
                            disabled={pending}
                          >
                            {pending ? `${name} (Pending)` : name}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                  {activeWorkspace?.demo ? <span className="pill">Demo</span> : null}
                </div>
                <div className="identity-pill user-identity">
                  <div className="avatar-menu">
                    <button
                      type="button"
                      className="workspace-avatar avatar-button"
                      data-tour="profile-button"
                      title="My profile"
                      onClick={() => navigate('/profile')}
                    >
                      {currentUser?.avatarUrl ? (
                        <img
                          src={resolveAssetUrl(currentUser.avatarUrl)}
                          alt=""
                          className="framed-avatar-image"
                          style={getAvatarFrameStyle(currentUser.avatarUrl)}
                          draggable={false}
                          onContextMenu={(event) => event.preventDefault()}
                        />
                      ) : (
                        <span>{(currentUser?.displayName ?? currentUser?.username ?? 'U').slice(0, 1).toUpperCase()}</span>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="link-button identity-name truncate"
                    onClick={() => navigate('/profile')}
                    title={currentUser?.displayName ?? currentUser?.username ?? 'User'}
                  >
                    {currentUser?.displayName ?? currentUser?.username ?? 'User'}
                  </button>
                </div>
              </div>
            ) : null}
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
            <button
              type="button"
              className={`burger${menuOpen ? ' is-open' : ''}`}
              aria-label="Toggle menu"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      <div className={`drawer-overlay${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
      <aside className={`drawer ${menuOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <strong>Menu</strong>
          <button type="button" className="btn btn-secondary" onClick={() => setMenuOpen(false)}>
            Close
          </button>
        </div>
        <nav className="drawer-nav">
          {isAuthed ? (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => (isActive ? 'active' : '') + (workspaceRequired ? ' disabled' : '')}
                title={workspaceRequired ? 'Select or join a workspace first' : undefined}
                onClick={(event) => {
                  if (workspaceRequired) {
                    event.preventDefault()
                    navigate('/settings')
                    return
                  }
                  setMenuOpen(false)
                }}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/assign"
                className={({ isActive }) => (isActive ? 'active' : '') + (workspaceRequired ? ' disabled' : '')}
                title={workspaceRequired ? 'Select or join a workspace first' : undefined}
                onClick={(event) => {
                  if (workspaceRequired) {
                    event.preventDefault()
                    navigate('/settings')
                    return
                  }
                  setMenuOpen(false)
                }}
              >
                Assign
              </NavLink>
              <NavLink
                to="/people"
                className={({ isActive }) => (isActive ? 'active' : '') + (workspaceRequired ? ' disabled' : '')}
                title={workspaceRequired ? 'Select or join a workspace first' : undefined}
                onClick={(event) => {
                  if (workspaceRequired) {
                    event.preventDefault()
                    navigate('/settings')
                    return
                  }
                  setMenuOpen(false)
                }}
              >
                People
              </NavLink>
              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? 'active' : '') + (workspaceRequired ? ' disabled' : '')}
                  title={workspaceRequired ? 'Select or join a workspace first' : undefined}
                  onClick={(event) => {
                    if (workspaceRequired) {
                      event.preventDefault()
                      navigate('/settings')
                      return
                    }
                    setMenuOpen(false)
                  }}
                >
                  Admin Panel
                </NavLink>
              ) : null}
              <NavLink
                to="/profile"
                className={({ isActive }) => (isActive ? 'active' : '') + (workspaceRequired ? ' disabled' : '')}
                title={workspaceRequired ? 'Select or join a workspace first' : undefined}
                onClick={(event) => {
                  if (workspaceRequired) {
                    event.preventDefault()
                    navigate('/settings')
                    return
                  }
                  setMenuOpen(false)
                }}
              >
                Profile
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Settings
              </NavLink>
              <button type="button" className="btn btn-secondary drawer-logout" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Register
              </NavLink>
            </>
          )}
        </nav>
      </aside>
      {tourOpen ? (
        <div className="onboarding-tour-overlay" role="dialog" aria-modal="true" aria-label="PMD onboarding tour">
          <div className="onboarding-tour-backdrop" />
          {tourHighlightRect && activeTourStep?.selector ? (
            <div
              className="onboarding-tour-highlight"
              style={{
                top: Math.max(8, tourHighlightRect.top - 6),
                left: Math.max(8, tourHighlightRect.left - 6),
                width: Math.min(window.innerWidth - 16, tourHighlightRect.width + 12),
                height: Math.min(window.innerHeight - 16, tourHighlightRect.height + 12),
              }}
            />
          ) : null}
          <div
            ref={tourCardRef}
            className="onboarding-tour-card"
            style={
              tourCardPosition
                ? { top: `${tourCardPosition.top}px`, left: `${tourCardPosition.left}px` }
                : undefined
            }
          >
            <div className="onboarding-tour-head">
              <strong>{activeTourStep?.title ?? 'PMD tour'}</strong>
              <span>
                {Math.min(tourStepIndex + 1, ONBOARDING_TOUR_STEPS.length)} / {ONBOARDING_TOUR_STEPS.length}
              </span>
            </div>
            <p className="onboarding-tour-description">{activeTourStep?.description}</p>
            <div className="onboarding-tour-actions">
              <button type="button" className="btn btn-ghost" onClick={completeTour}>
                Skip
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={prevTourStep}
                disabled={tourStepIndex === 0}
              >
                Back
              </button>
              <button type="button" className="btn btn-primary" onClick={nextTourStep}>
                {tourStepIndex >= ONBOARDING_TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main className={`container${isAssignRoute || isSettingsRoute || isPeopleRoute || isDashboardRoute ? ' container-full' : ''}`}>
        {backendOffline ? (
          <div className="banner warning" role="status">
            {backendMessage ?? `Backend unreachable (${API_BASE_URL}).`}
          </div>
        ) : null}
        {isAuthed && workspaceError ? (
          <div className="banner warning" role="status">
            {workspaceError}
          </div>
        ) : null}
        {isAuthed && hasWorkspace && !currentUser?.teamId ? (
          <div className="banner info" role="status">
            <strong>You are not in a team yet.</strong>
            <div className="muted">Join a team from your profile, or create one if you are an admin.</div>
            <div className="banner-actions">
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/profile')}>
                Go to profile
              </button>
              {isAdmin ? (
                <button type="button" className="btn btn-primary" onClick={() => navigate('/admin')}>
                  Create a team
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <Routes>
          <Route path="/" element={<Navigate to={isAuthed ? preferredAuthedRoute : '/login'} replace />} />
          <Route
            path="/dashboard"
            element={
              isAuthed ? (
                hasWorkspace ? (
                <>
                  {backendOffline ? (
                    <p className="error">Backend unreachable. Start the server to load projects.</p>
                  ) : projectError ? (
                    <p className="error">{projectError}</p>
                  ) : null}
                  {projectLoading && projects.length === 0 ? (
                    <PmdLoader size="md" variant="panel" />
                  ) : (
                    <DashboardPage
                      projects={projects}
                      users={users}
                      currentUser={currentUser}
                      selectedProjectId={dashboardSelectedProjectId}
                      onSelectProject={(id) => setDashboardSelectedProjectIdState(id)}
                      onClearSelection={() => setDashboardSelectedProjectIdState(null)}
                      onCreated={handleProjectCreated}
                      onRefresh={refreshProjectsBackground}
                      requireTeamOnProjectCreate={uiPreferences.requireTeamOnProjectCreate}
                    />
                  )}
                </>
                ) : workspaceLoading || workspaceError ? (
                  <PmdLoader size="md" variant="panel" />
                ) : (
                  noWorkspaceState
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/assign"
            element={
              isAuthed ? (
                hasWorkspace ? (
                <>
                  {backendOffline ? (
                    <p className="error">Backend unreachable. Start the server to load assignments.</p>
                  ) : (
                    <>
                      {usersError ? <p className="error">{usersError}</p> : null}
                      {projectError ? <p className="error">{projectError}</p> : null}
                    </>
                  )}
                  {projectLoading && projects.length === 0 ? (
                    <PmdLoader size="md" variant="panel" />
                  ) : (
                    <AssignPage
                      projects={projects}
                      users={users}
                      currentUser={currentUser}
                      selectedProjectId={assignSelectedProjectId}
                      onSelectProject={(id) =>
                        setAssignSelectedProjectIdState(assignSelectedProjectId === id ? null : id)
                      }
                      onClearSelection={() => setAssignSelectedProjectIdState(null)}
                      onRefresh={refreshProjectsBackground}
                      requireTeamOnProjectCreate={uiPreferences.requireTeamOnProjectCreate}
                    />
                  )}
                </>
                ) : workspaceLoading || workspaceError ? (
                  <PmdLoader size="md" variant="panel" />
                ) : (
                  noWorkspaceState
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/people"
            element={
              isAuthed ? (
                hasWorkspace ? (
                <>
                  {backendOffline ? (
                    <p className="error">Backend unreachable. Start the server to load people.</p>
                  ) : usersError ? (
                    <p className="error">{usersError}</p>
                  ) : null}
                  {usersLoading ? <PmdLoader size="md" variant="panel" /> : null}
                  {!usersLoading ? (
                    <PeoplePage
                      users={users}
                      projects={projects}
                      rememberSelection={uiPreferences.rememberPeopleSelection}
                    />
                  ) : null}
                </>
                ) : workspaceLoading || workspaceError ? (
                  <PmdLoader size="md" variant="panel" />
                ) : (
                  noWorkspaceState
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthed ? (
                isAdmin ? (
                  <AdminPanel />
                ) : workspaceLoading || workspaceError ? (
                  <PmdLoader size="md" variant="panel" />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route path="/adminpanel" element={<Navigate to="/admin" replace />} />
          <Route
            path="/profile"
            element={
              isAuthed ? (
                hasWorkspace && currentUser ? (
                  <ProfilePanel user={currentUser} onSaved={handleProfileSaved} onClose={() => navigate(preferredAuthedRoute)} />
                ) : workspaceLoading || workspaceError ? (
                  <PmdLoader size="md" variant="panel" />
                ) : (
                  noWorkspaceState
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/settings"
            element={
              isAuthed ? (
                <SettingsPage preferences={uiPreferences} onChange={handlePreferencesChange} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              isAuthed ? (
                <Navigate to={preferredAuthedRoute} replace />
              ) : (
                <LoginForm
                  onLogin={handleLogin}
                  error={authError}
                  loading={authLoading}
                  onSwitchToRegister={() => navigate('/register')}
                />
              )
            }
          />
          <Route
            path="/register"
            element={
              isAuthed ? (
                <Navigate to={preferredAuthedRoute} replace />
              ) : (
                <RegisterForm
                  onRegister={handleRegister}
                  loading={authLoading}
                  onSwitchToLogin={() => navigate('/login')}
                />
              )
            }
          />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="*" element={<Navigate to={isAuthed ? preferredAuthedRoute : '/login'} replace />} />
        </Routes>
      </main>
    </>
  )
}

export default App
