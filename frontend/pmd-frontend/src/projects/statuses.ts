import type { ProjectStatus } from '../types'

export const UNASSIGNED_FILTER_KEY = 'UNASSIGNED' as const

export type ProjectFolderKey = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'ARCHIVED'

export const PROJECT_FOLDERS: { key: ProjectFolderKey; label: string }[] = [
  { key: 'NOT_STARTED', label: 'Not Started' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELED', label: 'Canceled' },
  { key: 'ARCHIVED', label: 'Archived' },
]

export const PROJECT_STATUS_FLOW: ProjectFolderKey[] = PROJECT_FOLDERS.map((folder) => folder.key)

// Keep archived as a gated action rather than a normal status select option.
export const PROJECT_STATUS_SELECTABLE: ProjectStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
]

export function toFolderKey(status?: string | null): ProjectFolderKey {
  if (!status) return 'NOT_STARTED'
  if (status === 'ARCHIVED') return 'ARCHIVED'
  if (status === 'IN_PROGRESS') return 'IN_PROGRESS'
  if (status === 'COMPLETED') return 'COMPLETED'
  if (status === 'CANCELED') return 'CANCELED'
  return 'NOT_STARTED'
}

export function formatStatusLabel(value?: string | null) {
  if (!value) return 'Unknown'
  return value.replace('_', ' ')
}

