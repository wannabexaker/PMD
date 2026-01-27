import { requestJson } from './http'
import type {
  PeopleOverviewStatsResponse,
  PeopleUserStatsResponse,
  UserStatsResponse,
  WorkspaceDashboardStatsResponse,
} from '../types'

export async function fetchDashboardStats(teams?: string[], assignedToMe?: boolean): Promise<WorkspaceDashboardStatsResponse> {
  const params = new URLSearchParams()
  if (teams && teams.length > 0) {
    teams.forEach((team) => params.append('teams', team))
  }
  if (assignedToMe) {
    params.append('assignedToMe', 'true')
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return requestJson<WorkspaceDashboardStatsResponse>(`/api/stats/dashboard${suffix}`)
}

export async function fetchMyUserStats(): Promise<UserStatsResponse> {
  return requestJson<UserStatsResponse>('/api/stats/user/me')
}

export async function fetchUserStats(userId: string): Promise<UserStatsResponse> {
  return requestJson<UserStatsResponse>(`/api/stats/user/${userId}`)
}

export async function fetchPeopleOverviewStats(): Promise<PeopleOverviewStatsResponse> {
  return requestJson<PeopleOverviewStatsResponse>('/api/stats/people/overview')
}

export async function fetchPeopleUserStats(userId: string): Promise<PeopleUserStatsResponse> {
  return requestJson<PeopleUserStatsResponse>(`/api/stats/people/${userId}`)
}
