import { useCallback, useEffect, useState } from 'react'
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
import { Logo } from './components/Logo'
import { ThemeToggle } from './components/ThemeToggle'
import { PmdLoader } from './components/common/PmdLoader'
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
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const location = useLocation()
  const navigate = useNavigate()
  const isAuthed = Boolean(currentUser)
  const isAdmin = (currentUser?.team ?? '').toLowerCase() === 'admin'
  const isAssignRoute = location.pathname === '/assign'

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
      const includeAdmins = (currentUser?.team ?? '').toLowerCase() === 'admin'
      const filtered = includeAdmins ? data : data.filter((user) => (user.team ?? '').toLowerCase() !== 'admin')
      setUsers(filtered)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users'
      setUsersError(message === 'Not Found' ? 'Unable to load users.' : message)
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
      if (selectedProjectId && !data.some((project) => project.id === selectedProjectId)) {
        setSelectedProjectId(null)
      }
    } catch (err) {
      setProjectError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setProjectLoading(false)
    }
  }, [selectedProjectId])

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
    loadMe()
  }, [loadMe])

  useEffect(() => {
    document.body.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentUser(null)
      navigate('/login')
    }
    window.addEventListener('pmd:unauthorized', handleUnauthorized)
    return () => {
      window.removeEventListener('pmd:unauthorized', handleUnauthorized)
    }
  }, [navigate])

  useEffect(() => {
    setMenuOpen(false)
    setAuthError(null)
  }, [location.pathname])

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
    navigate('/login')
  }

  const handleProfileSaved = (user: User) => {
    setCurrentUser(user)
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
        <Routes>
          <Route path="/" element={<Navigate to={isAuthed ? '/dashboard' : '/login'} replace />} />
          <Route
            path="/dashboard"
            element={
              isAuthed ? (
                <>
                  {projectError ? <p className="error">{projectError}</p> : null}
                  {projectLoading ? (
                    <PmdLoader size="md" variant="panel" />
                  ) : (
                    <DashboardPage
                      projects={projects}
                      users={users}
                      currentUser={currentUser}
                      selectedProjectId={selectedProjectId}
                      onSelectProject={(id) => setSelectedProjectId(id)}
                      onClearSelection={() => setSelectedProjectId(null)}
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
                  {usersError ? <p className="error">{usersError}</p> : null}
                  {projectError ? <p className="error">{projectError}</p> : null}
                  {projectLoading ? (
                    <PmdLoader size="md" variant="panel" />
                  ) : (
                    <AssignPage
                      projects={projects}
                      users={users}
                      currentUser={currentUser}
                      selectedProjectId={selectedProjectId}
                      onSelectProject={(id) => setSelectedProjectId(selectedProjectId === id ? null : id)}
                      onClearSelection={() => setSelectedProjectId(null)}
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
                  {usersError ? <p className="error">{usersError}</p> : null}
                  {usersLoading ? <PmdLoader size="md" variant="panel" /> : null}
                  {!usersLoading ? <PeoplePage users={users} projects={projects} /> : null}
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
    </AuthProvider>
  )
}

export default App
