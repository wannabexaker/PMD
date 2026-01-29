import { requestJson } from './http'
import type { Team } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchTeams(): Promise<Team[]> {
  const data = await requestJson<unknown>('/api/teams')
  return asArray<Team>(data)
}

export async function createTeam(name: string): Promise<Team> {
  return requestJson<Team>('/api/teams', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}
