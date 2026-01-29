import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import type { LoginPayload, Project, RegisterPayload, User, UserSummary } from './types'
import { fetchUsers } from './api/users'
import { fetchProjects } from './api/projects'
import { fetchMe, login, register } from './api/auth'
import { API_BASE_URL, clearAuthToken, getAuthToken, isApiError } from './api/http'
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
import { TeamsProvider } from './teams/TeamsContext'
import { DEFAULT_UI_PREFERENCES, loadUiPreferences, saveUiPreferences } from './ui/uiPreferences'
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
import './App.css'

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
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
  const previousPathRef = useRef<string>(location.pathname)
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline'>('online')
  const [backendMessage, setBackendMessage] = useState<string | null>(null)

  const location = useLocation()
  const navigate = useNavigate()
  const isAuthed = Boolean(currentUser)
  const isAdmin = Boolean(currentUser?.isAdmin)
  const isAssignRoute = location.pathname === '/assign'
  const backendOffline = backendStatus === 'offline'

  const loadMe = useCallback(async () => {
    setAuthError(null)
    setAuthLoading(true)
    if (!getAuthToken()) {
      setCurrentUser(null)
      setAuthLoading(false)
      return
    }
    const user = await fetchMe()
    setCurrentUser(user)
    setAuthLoading(false)
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersError(null)
    setUsersLoading(true)
    try {
      const data = await fetchUsers()
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
  }, [currentUser])

  const loadProjects = useCallback(async () => {
    setProjectError(null)
    setProjectLoading(true)
    try {
      const data = await fetchProjects()
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
      setProjectLoading(false)
    }
  }, [dashboardSelectedProjectId, assignSelectedProjectId])

  const handleProjectCreated = useCallback(
    (project?: Project) => {
      if (project?.id) {
        setProjects((prev) => [project, ...prev.filter((item) => item.id !== project.id)])
      }
      loadProjects()
    },
    [loadProjects]
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
  }, [dashboardSelectedProjectId, uiPreferences.rememberDashboardProject])

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
  }, [assignSelectedProjectId, uiPreferences.rememberAssignProject])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null)
      setDashboardSelectedProjectIdState(null)
      setAssignSelectedProjectIdState(null)
      clearUiSelections()
      navigate('/login')
    }
    window.addEventListener('pmd:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('pmd:unauthorized', handleUnauthorized)
    }
  }, [navigate])

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
      if (currentUser) {
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
  }, [currentUser, loadProjects, loadUsers])

  useEffect(() => {
    setMenuOpen(false)
    setAuthError(null)
  }, [location.pathname])

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
  }, [location.pathname, uiPreferences])

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
  }, [menuOpen])

  useEffect(() => {
    if (!currentUser) {
      return
    }
    loadUsers()
    loadProjects()
  }, [currentUser, loadUsers, loadProjects])

  const handleLogin = async (payload: LoginPayload) => {
    setAuthError(null)
    try {
      setAuthLoading(true)
      const response = await login(payload)
      setCurrentUser(response.user ?? null)
      setDashboardSelectedProjectIdState(null)
      setAssignSelectedProjectIdState(null)
      clearUiSelections()
      navigate('/dashboard')
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 401) {
          setAuthError('Wrong email or password.')
        } else if (err.status === 403) {
          setAuthError('Access denied. Your account may be disabled.')
        } else if (err.status >= 500) {
          setAuthError('Server error. Try again in a moment.')
        } else if (err.status === 0) {
          setAuthError(`Cannot reach server (${API_BASE_URL}).`)
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

  const handleRegister = async (payload: RegisterPayload) => {
    setAuthError(null)
    try {
      setAuthLoading(true)
      await register(payload)
    } catch (err) {
      if (isApiError(err)) {
        if (err.status === 409) {
          setAuthError('An account with this email already exists.')
        } else if (err.status === 400 || err.status === 422) {
          setAuthError('Please check the form fields.')
        } else if (err.status >= 500) {
          setAuthError('Server error. Try again in a moment.')
        } else if (err.status === 0) {
          setAuthError(`Cannot reach server (${API_BASE_URL}).`)
        } else {
          setAuthError(err.message)
        }
      } else {
        setAuthError(err instanceof Error ? err.message : 'Registration failed')
      }
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = () => {
    clearAuthToken()
    setCurrentUser(null)
    setDashboardSelectedProjectIdState(null)
    setAssignSelectedProjectIdState(null)
    clearUiSelections()
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


  if (authLoading) {
    return (
      <div className="container">
        <PmdLoader size="lg" variant="fullscreen" label="Loading..." />
      </div>
    )
  }

  return (
    <AuthProvider user={currentUser}>
      <TeamsProvider user={currentUser}>
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <Logo size={26} />
          </div>
          <div className="topbar-actions">
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
            {isAuthed ? (
              <button
                type="button"
                className="link-button profile-pill truncate"
                onClick={() => navigate('/profile')}
                title={currentUser?.displayName ?? currentUser?.username ?? 'User'}
              >
                {currentUser?.displayName ?? currentUser?.username ?? 'User'}
              </button>
            ) : null}
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
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
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </NavLink>
              <NavLink
                to="/assign"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                Assign
              </NavLink>
              <NavLink
                to="/people"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
              >
                People
              </NavLink>
              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) => (isActive ? 'active' : '')}
                  onClick={() => setMenuOpen(false)}
                >
                  Admin Panel
                </NavLink>
              ) : null}
              <NavLink
                to="/profile"
                className={({ isActive }) => (isActive ? 'active' : '')}
                onClick={() => setMenuOpen(false)}
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

      <main className={`container${isAssignRoute ? ' container-full' : ''}`}>
        {backendOffline ? (
          <div className="banner warning" role="status">
            {backendMessage ?? `Backend unreachable (${API_BASE_URL}).`}
          </div>
        ) : null}
        <Routes>
          <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
          <Route
            path="/dashboard"
            element={
              isAuthed ? (
                <>
                  {backendOffline ? (
                    <p className="error">Backend unreachable. Start the server to load projects.</p>
                  ) : projectError ? (
                    <p className="error">{projectError}</p>
                  ) : null}
                  {projectLoading ? (
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
                      onRefresh={loadProjects}
                    />
                  )}
                </>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/assign"
            element={
              isAuthed ? (
                <>
                  {backendOffline ? (
                    <p className="error">Backend unreachable. Start the server to load assignments.</p>
                  ) : (
                    <>
                      {usersError ? <p className="error">{usersError}</p> : null}
                      {projectError ? <p className="error">{projectError}</p> : null}
                    </>
                  )}
                  {projectLoading ? (
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
                      onRefresh={loadProjects}
                    />
                  )}
                </>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/people"
            element={
              isAuthed ? (
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
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthed && isAdmin ? (
                <AdminPanel users={users} projects={projects} />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            }
          />
          <Route
            path="/profile"
            element={
              isAuthed && currentUser ? (
                <ProfilePanel user={currentUser} onSaved={handleProfileSaved} onClose={() => navigate('/dashboard')} />
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
                <Navigate to="/dashboard" replace />
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
                <Navigate to="/dashboard" replace />
              ) : (
                <RegisterForm
                  onRegister={handleRegister}
                  error={authError}
                  loading={authLoading}
                  onSwitchToLogin={() => navigate('/login')}
                />
              )
            }
          />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="*" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
        </Routes>
      </main>
      </TeamsProvider>
    </AuthProvider>
  )
}

export default App
