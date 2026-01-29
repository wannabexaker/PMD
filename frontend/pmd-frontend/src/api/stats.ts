import { requestJson } from './http'
import type {
  PeopleOverviewStatsResponse,
  PeopleUserStatsResponse,
  UserStatsResponse,
  WorkspaceDashboardStatsResponse,
} from '../types'

export async function fetchDashboardStats(
  workspaceId: string,
  teams?: string[],
  assignedToMe?: boolean
): Promise<WorkspaceDashboardStatsResponse> {
  const params = new URLSearchParams()
  if (teams && teams.length > 0) {
    teams.forEach((team) => params.append('teams', team))
  }
  if (assignedToMe) {
    params.append('assignedToMe', 'true')
  }
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return requestJson<WorkspaceDashboardStatsResponse>(`/api/workspaces/${workspaceId}/stats/dashboard${suffix}`)
}

export async function fetchMyUserStats(workspaceId: string): Promise<UserStatsResponse> {
  return requestJson<UserStatsResponse>(`/api/workspaces/${workspaceId}/stats/user/me`)
}

export async function fetchUserStats(workspaceId: string, userId: string): Promise<UserStatsResponse> {
  return requestJson<UserStatsResponse>(`/api/workspaces/${workspaceId}/stats/user/${userId}`)
}

export async function fetchPeopleOverviewStats(workspaceId: string): Promise<PeopleOverviewStatsResponse> {
  return requestJson<PeopleOverviewStatsResponse>(`/api/workspaces/${workspaceId}/stats/people/overview`)
}

export async function fetchPeopleUserStats(
  workspaceId: string,
  userId: string
): Promise<PeopleUserStatsResponse> {
  return requestJson<PeopleUserStatsResponse>(`/api/workspaces/${workspaceId}/stats/people/${userId}`)
}
