import { requestJson } from './http'
import type { RecommendationToggleResponse, UserSummary } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchUsers(params?: { q?: string; team?: string }): Promise<UserSummary[]> {
  const query = new URLSearchParams()
  if (params?.q) query.set('q', params.q)
  if (params?.team) query.set('team', params.team)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const data = await requestJson<unknown>(`/api/users${suffix}`)
  return asArray<UserSummary>(data)
}

export async function toggleRecommendation(personId: string): Promise<RecommendationToggleResponse> {
  return requestJson<RecommendationToggleResponse>(`/api/people/${personId}/recommendations/toggle`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export async function fetchRecommendationDetails(personId: string): Promise<UserSummary[]> {
  const data = await requestJson<unknown>(`/api/people/${personId}/recommendations`)
  return asArray<UserSummary>(data)
}

export async function fetchRecommendedPeople(teamId?: string): Promise<UserSummary[]> {
  const query = new URLSearchParams()
  if (teamId) query.set('teamId', teamId)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const data = await requestJson<unknown>(`/api/people/recommended${suffix}`)
  return asArray<UserSummary>(data)
}
