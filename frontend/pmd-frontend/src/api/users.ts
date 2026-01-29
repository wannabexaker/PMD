import { requestJson } from './http'
import type { RecommendationToggleResponse, UserSummary } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchUsers(
  workspaceId: string,
  params?: { q?: string; teamId?: string }
): Promise<UserSummary[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.teamId) query.set('teamId', params.teamId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/users${suffix}`)
  return asArray<UserSummary>(data)
}

export async function toggleRecommendation(
  workspaceId: string,
  personId: string
): Promise<RecommendationToggleResponse> {
  return requestJson<RecommendationToggleResponse>(
    `/api/workspaces/${workspaceId}/people/${personId}/recommendations/toggle`,
    {
    method: 'POST',
    body: JSON.stringify({}),
    }
  )
}

export async function fetchRecommendationDetails(workspaceId: string, personId: string): Promise<UserSummary[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/people/${personId}/recommendations`)
  return asArray<UserSummary>(data)
}

export async function fetchRecommendedPeople(
  workspaceId: string,
  teamId?: string
): Promise<UserSummary[]> {
  const query = new URLSearchParams()
  if (teamId) query.set('teamId', teamId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/people/recommended${suffix}`)
  return asArray<UserSummary>(data)
}
