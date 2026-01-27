import { requestJson } from './http'
import type { CreateProjectPayload, DashboardStatsResponse, Project, RandomAssignResponse } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchProjects(params?: { assignedToMe?: boolean }): Promise<Project[]> {
  const query = new URLSearchParams()
  if (params?.assignedToMe) {
    query.set('assignedToMe', 'true')
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const data = await requestJson<unknown>(`/api/projects${suffix}`)
  return asArray<Project>(data)
}

export async function fetchMyDashboardStats(): Promise<DashboardStatsResponse> {
  return requestJson<DashboardStatsResponse>('/api/projects/my-stats')
}

export async function fetchProject(id: string): Promise<Project | null> {
  const data = await requestJson<Project>(`/api/projects/${id}`)
  return data ?? null
}

export async function createProject(payload: CreateProjectPayload): Promise<Project> {
  return requestJson<Project>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateProject(id: string, payload: CreateProjectPayload): Promise<Project> {
  return requestJson<Project>(`/api/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteProject(id: string): Promise<void> {
  await requestJson<void>(`/api/projects/${id}`, {
    method: 'DELETE',
  })
}

export async function randomProject(teamId?: string): Promise<Project> {
  return requestJson<Project>('/api/projects/random', {
    method: 'POST',
    body: JSON.stringify(teamId ? { teamId } : {}),
  })
}

export async function randomAssign(projectId: string, teamId?: string): Promise<RandomAssignResponse> {
  return requestJson<RandomAssignResponse>(`/api/projects/${projectId}/random-assign`, {
    method: 'POST',
    body: JSON.stringify(teamId ? { teamId } : {}),
  })
}
