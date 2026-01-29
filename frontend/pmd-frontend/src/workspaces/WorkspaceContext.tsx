/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Workspace } from '../types'
import { useAuth } from '../auth/authUtils'
import {
  createWorkspace as createWorkspaceApi,
  enterDemoWorkspace,
  fetchWorkspaces,
  joinWorkspace as joinWorkspaceApi,
  resetDemoWorkspace as resetDemoWorkspaceApi,
} from '../api/workspaces'

const ACTIVE_WORKSPACE_KEY = 'pmd.activeWorkspaceId'
const LEGACY_WORKSPACE_KEY = 'pmd:lastWorkspaceId'
const LEGACY_WORKSPACE_KEY_ALT = 'pmd_active_workspace_id'

type WorkspaceContextValue = {
  workspaces: Workspace[]
  loading: boolean
  error: string | null
  activeWorkspaceId: string | null
  activeWorkspace: Workspace | null
  setActiveWorkspaceId: (id: string | null) => void
  refresh: () => Promise<void>
  createWorkspace: (name: string) => Promise<Workspace | null>
  joinWorkspace: (token: string) => Promise<Workspace | null>
  enterDemo: () => Promise<Workspace | null>
  resetDemo: () => Promise<boolean>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

function loadStoredWorkspaceId(): string | null {
  try {
    const current = localStorage.getItem(ACTIVE_WORKSPACE_KEY)
    if (current) {
      return current
    }
    const legacy = localStorage.getItem(LEGACY_WORKSPACE_KEY) ?? localStorage.getItem(LEGACY_WORKSPACE_KEY_ALT)
    if (legacy) {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, legacy)
      localStorage.removeItem(LEGACY_WORKSPACE_KEY)
      localStorage.removeItem(LEGACY_WORKSPACE_KEY_ALT)
      return legacy
    }
    return null
  } catch {
    return null
  }
}

function persistWorkspaceId(id: string | null) {
  try {
    if (!id) {
      localStorage.removeItem(ACTIVE_WORKSPACE_KEY)
      localStorage.removeItem(LEGACY_WORKSPACE_KEY)
      localStorage.removeItem(LEGACY_WORKSPACE_KEY_ALT)
      return
    }
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id)
  } catch {
    // ignore storage errors
  }
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() => loadStoredWorkspaceId())

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    if (!id) {
      setActiveWorkspaceIdState(null)
      persistWorkspaceId(null)
      return
    }
    const workspace = workspaces.find((item) => item.id === id)
    if (workspace && workspace.status === 'PENDING') {
      return
    }
    setActiveWorkspaceIdState(id)
    persistWorkspaceId(id)
  }, [workspaces])

  const refresh = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setError(null)
      setLoading(false)
      setActiveWorkspaceId(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWorkspaces()
      setWorkspaces(data)
      const stored = loadStoredWorkspaceId()
      const storedWorkspace = stored ? data.find((workspace) => workspace.id === stored) : null
      if (storedWorkspace && storedWorkspace.status === 'ACTIVE') {
        setActiveWorkspaceIdState(storedWorkspace.id ?? null)
      } else {
        const activeWorkspaces = data.filter((workspace) => workspace.status === 'ACTIVE')
        if (activeWorkspaces.length === 1) {
          setActiveWorkspaceIdState(activeWorkspaces[0]?.id ?? null)
          persistWorkspaceId(activeWorkspaces[0]?.id ?? null)
        } else {
          setActiveWorkspaceIdState(null)
          persistWorkspaceId(null)
        }
      } else {
        setActiveWorkspaceIdState(null)
        persistWorkspaceId(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces')
    } finally {
      setLoading(false)
    }
  }, [user, setActiveWorkspaceId])

  const createWorkspace = useCallback(async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Workspace name is required.')
      return null
    }
    try {
      const created = await createWorkspaceApi(trimmed)
      setWorkspaces((prev) => {
        const next = [created, ...prev.filter((ws) => ws.id !== created.id)]
        return next.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      })
      setActiveWorkspaceId(created.id ?? null)
      return created
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace')
      return null
    }
  }, [setActiveWorkspaceId])

  const joinWorkspace = useCallback(async (token: string) => {
    const trimmed = token.trim()
    if (!trimmed) {
      setError('Invite token is required.')
      return null
    }
    try {
      const joined = await joinWorkspaceApi(trimmed)
      setWorkspaces((prev) => {
        const next = [joined, ...prev.filter((ws) => ws.id !== joined.id)]
        return next.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      })
      if (joined.status === 'ACTIVE') {
        setActiveWorkspaceId(joined.id ?? null)
      } else {
        setActiveWorkspaceId(null)
      }
      return joined
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join workspace')
      return null
    }
  }, [setActiveWorkspaceId])

  const enterDemo = useCallback(async () => {
    try {
      const demo = await enterDemoWorkspace()
      setWorkspaces((prev) => {
        const next = [demo, ...prev.filter((ws) => ws.id !== demo.id)]
        return next.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      })
      setActiveWorkspaceId(demo.id ?? null)
      return demo
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enter demo workspace')
      return null
    }
  }, [setActiveWorkspaceId])

  const resetDemo = useCallback(async () => {
    const workspaceId = activeWorkspaceId
    if (!workspaceId) {
      setError('Select a demo workspace first.')
      return false
    }
    try {
      await resetDemoWorkspaceApi(workspaceId)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset demo workspace')
      return false
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    if (!user) {
      setWorkspaces([])
      setError(null)
      setLoading(false)
      setActiveWorkspaceId(null)
      persistWorkspaceId(null)
      return
    }
    refresh()
  }, [user, refresh, setActiveWorkspaceId])

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null,
    [workspaces, activeWorkspaceId]
  )

  const value = useMemo(
    () => ({
      workspaces,
      loading,
      error,
      activeWorkspaceId,
      activeWorkspace,
      setActiveWorkspaceId,
      refresh,
      createWorkspace,
      joinWorkspace,
      enterDemo,
      resetDemo,
    }),
    [
      workspaces,
      loading,
      error,
      activeWorkspaceId,
      activeWorkspace,
      setActiveWorkspaceId,
      refresh,
      createWorkspace,
      joinWorkspace,
      enterDemo,
      resetDemo,
    ]
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}
