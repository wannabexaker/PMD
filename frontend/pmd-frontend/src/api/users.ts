import { requestJson } from './http'
import type { UserSummary } from '../types'

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