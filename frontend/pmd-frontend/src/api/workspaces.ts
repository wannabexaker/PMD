import { requestJson } from './http'
import type { Workspace } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const data = await requestJson<unknown>('/api/workspaces')
  return asArray<Workspace>(data)
}

export async function createWorkspace(name: string): Promise<Workspace> {
  return requestJson<Workspace>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function joinWorkspace(token: string): Promise<Workspace> {
  return requestJson<Workspace>('/api/workspaces/join', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

export async function enterDemoWorkspace(): Promise<Workspace> {
  return requestJson<Workspace>('/api/workspaces/demo', {
    method: 'POST',
  })
}

export async function resetDemoWorkspace(workspaceId: string): Promise<void> {
  await requestJson<void>(`/api/workspaces/${workspaceId}/demo/reset`, {
    method: 'POST',
  })
}
