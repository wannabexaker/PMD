import { requestJson } from './http'
import type { Person } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function listPeople(workspaceId: string): Promise<Person[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/people`)
  return asArray<Person>(data)
}

export async function createPerson(
  workspaceId: string,
  payload: { displayName: string; email?: string }
): Promise<Person> {
  return requestJson<Person>(`/api/workspaces/${workspaceId}/people`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePerson(
  workspaceId: string,
  id: string,
  payload: { displayName: string; email?: string }
): Promise<Person> {
  return requestJson<Person>(`/api/workspaces/${workspaceId}/people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deletePerson(workspaceId: string, id: string): Promise<void> {
  await requestJson<void>(`/api/workspaces/${workspaceId}/people/${id}`, {
    method: 'DELETE',
  })
}
