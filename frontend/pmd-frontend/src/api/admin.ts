import { requestJson } from './http'
import type { AdminAuditRow, AdminOverview, AdminUserRow, AdminWorkspaceRow } from '../types'

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue
    search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export async function getAdminOverview(): Promise<AdminOverview> {
  return requestJson<AdminOverview>('/api/admin/overview')
}

export async function listAdminWorkspaces(): Promise<AdminWorkspaceRow[]> {
  return requestJson<AdminWorkspaceRow[]>('/api/admin/workspaces')
}

export async function listAdminUsers(query?: string): Promise<AdminUserRow[]> {
  return requestJson<AdminUserRow[]>(`/api/admin/users${toQuery({ q: query?.trim() || undefined })}`)
}

export async function listAdminAudit(filters: {
  workspaceId?: string
  actorUserId?: string
  category?: string
  action?: string
  q?: string
  limit?: number
}): Promise<AdminAuditRow[]> {
  return requestJson<AdminAuditRow[]>(
    `/api/admin/audit${toQuery({
      workspaceId: filters.workspaceId?.trim() || undefined,
      actorUserId: filters.actorUserId?.trim() || undefined,
      category: filters.category?.trim() || undefined,
      action: filters.action?.trim() || undefined,
      q: filters.q?.trim() || undefined,
      limit: filters.limit,
    })}`,
  )
}

