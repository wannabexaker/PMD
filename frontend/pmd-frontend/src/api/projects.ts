import { requestJson } from './http'
import type { CreateProjectPayload, DashboardStatsResponse, Project, RandomAssignResponse } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchProjects(
  workspaceId: string,
  params?: { assignedToMe?: boolean }
): Promise<Project[]> {
  const query = new URLSearchParams()
  if (params?.assignedToMe) {
    query.set('assignedToMe', 'true')
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/projects${suffix}`)
  return asArray<Project>(data)
}

export async function fetchMyDashboardStats(workspaceId: string): Promise<DashboardStatsResponse> {
  return requestJson<DashboardStatsResponse>(`/api/workspaces/${workspaceId}/projects/my-stats`)
}

export async function fetchProject(workspaceId: string, id: string): Promise<Project | null> {
  const data = await requestJson<Project>(`/api/workspaces/${workspaceId}/projects/${id}`)
  return data ?? null
}

export async function createProject(workspaceId: string, payload: CreateProjectPayload): Promise<Project> {
  return requestJson<Project>(`/api/workspaces/${workspaceId}/projects`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateProject(
  workspaceId: string,
  id: string,
  payload: CreateProjectPayload
): Promise<Project> {
  return requestJson<Project>(`/api/workspaces/${workspaceId}/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteProject(workspaceId: string, id: string): Promise<void> {
  await requestJson<void>(`/api/workspaces/${workspaceId}/projects/${id}`, {
    method: 'DELETE',
  })
}

export async function randomProject(workspaceId: string, teamId?: string): Promise<Project> {
  return requestJson<Project>(`/api/workspaces/${workspaceId}/projects/random`, {
    method: 'POST',
    body: JSON.stringify(teamId ? { teamId } : {}),
  })
}

export async function randomAssign(
  workspaceId: string,
  projectId: string,
  teamId?: string
): Promise<RandomAssignResponse> {
  return requestJson<RandomAssignResponse>(`/api/workspaces/${workspaceId}/projects/${projectId}/random-assign`, {
    method: 'POST',
    body: JSON.stringify(teamId ? { teamId } : {}),
  })
}
