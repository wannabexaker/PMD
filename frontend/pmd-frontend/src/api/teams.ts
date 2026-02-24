import { requestJson } from './http'
import type { Team } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchTeams(workspaceId: string): Promise<Team[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/teams`)
  return asArray<Team>(data)
}

export async function createTeam(workspaceId: string, name: string, color?: string): Promise<Team> {
  return requestJson<Team>(`/api/workspaces/${workspaceId}/teams`, {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  })
}

export async function updateTeam(
  workspaceId: string,
  id: string,
  payload: { name?: string; isActive?: boolean; color?: string }
): Promise<Team> {
  return requestJson<Team>(`/api/workspaces/${workspaceId}/teams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
