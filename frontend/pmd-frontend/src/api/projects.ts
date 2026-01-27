import { requestJson } from './http'
import type { CreateProjectPayload, DashboardStatsResponse, Project } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchProjects(): Promise<Project[]> {
  const data = await requestJson<unknown>('/api/projects')
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

export async function archiveProject(id: string): Promise<void> {
  // TODO: backend endpoint for archiving a project
  await Promise.resolve()
}

export async function restoreProject(id: string): Promise<void> {
  // TODO: backend endpoint for restoring a project
  await Promise.resolve()
}
