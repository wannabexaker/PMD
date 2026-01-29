import { requestJson } from './http'
import type { Person } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function listPeople(): Promise<Person[]> {
  const data = await requestJson<unknown>('/api/people')
  return asArray<Person>(data)
}

export async function createPerson(payload: { displayName: string; email?: string }): Promise<Person> {
  return requestJson<Person>('/api/people', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePerson(id: string, payload: { displayName: string; email?: string }): Promise<Person> {
  return requestJson<Person>(`/api/people/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deletePerson(id: string): Promise<void> {
  await requestJson<void>(`/api/people/${id}`, {
    method: 'DELETE',
  })
}
