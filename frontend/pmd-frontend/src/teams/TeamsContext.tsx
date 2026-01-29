import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Team, User } from '../types'
import { createTeam as createTeamApi, fetchTeams } from '../api/teams'
import { isApiError } from '../api/http'

type TeamsContextValue = {
  teams: Team[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createTeam: (name: string) => Promise<Team | null>
  teamById: Map<string, Team>
}

const TeamsContext = createContext<TeamsContextValue | null>(null)

export function TeamsProvider({ user, children }: { user: User | null; children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTeams()
      const sorted = [...data].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
      setTeams(sorted)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load teams'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [user])

  const createTeam = useCallback(
    async (name: string) => {
      if (!name.trim()) {
        setError('Team name is required.')
        return null
      }
      try {
        const created = await createTeamApi(name.trim())
        setTeams((prev) => {
          const next = [created, ...prev.filter((team) => team.id !== created.id)]
          return next.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        })
        return created
      } catch (err) {
        if (isApiError(err) && err.status === 409) {
          setError('Team already exists.')
        } else {
          const message = err instanceof Error ? err.message : 'Failed to create team'
          setError(message)
        }
        return null
      }
    },
    []
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  const teamById = useMemo(() => {
    const map = new Map<string, Team>()
    teams.forEach((team) => {
      if (team.id) {
        map.set(team.id, team)
      }
    })
    return map
  }, [teams])

  return (
    <TeamsContext.Provider value={{ teams, loading, error, refresh, createTeam, teamById }}>
      {children}
    </TeamsContext.Provider>
  )
}

export function useTeams() {
  const ctx = useContext(TeamsContext)
  if (!ctx) {
    throw new Error('useTeams must be used within TeamsProvider')
  }
  return ctx
}
