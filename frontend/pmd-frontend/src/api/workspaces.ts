import { requestJson } from './http'
import type {
  Workspace,
  WorkspaceInvite,
  WorkspaceInviteResolve,
  WorkspaceJoinRequest,
  WorkspaceAuditEvent,
  WorkspaceRole,
  WorkspacePermissions,
} from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchWorkspaces(): Promise<Workspace[]> {
  const data = await requestJson<unknown>('/api/workspaces')
  return asArray<Workspace>(data)
}

export async function createWorkspace(
  name: string,
  initialTeams?: { name: string }[]
): Promise<Workspace> {
  return requestJson<Workspace>('/api/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name, initialTeams }),
  })
}

export async function joinWorkspace(token: string, inviteAnswer?: string): Promise<Workspace> {
  return requestJson<Workspace>('/api/workspaces/join', {
    method: 'POST',
    body: JSON.stringify({ token, inviteAnswer }),
  })
}

export async function createInvite(
  workspaceId: string,
  payload?: {
    expiresAt?: string
    maxUses?: number
    defaultRoleId?: string
    invitedEmail?: string
    joinQuestion?: string
  }
) {
  return requestJson<WorkspaceInvite>(`/api/workspaces/${workspaceId}/invites`, {
    method: 'POST',
    body: JSON.stringify(payload ?? {}),
  })
}

export async function listInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/invites`)
  return asArray<WorkspaceInvite>(data)
}

export async function revokeInvite(workspaceId: string, inviteId: string): Promise<WorkspaceInvite> {
  return requestJson<WorkspaceInvite>(`/api/workspaces/${workspaceId}/invites/${inviteId}/revoke`, {
    method: 'POST',
  })
}

export async function resolveInvite(invite: string): Promise<WorkspaceInviteResolve> {
  return requestJson<WorkspaceInviteResolve>('/api/workspaces/invites/resolve', {
    method: 'POST',
    body: JSON.stringify({ invite }),
  })
}

export async function listJoinRequests(workspaceId: string): Promise<WorkspaceJoinRequest[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/requests`)
  return asArray<WorkspaceJoinRequest>(data)
}

export async function approveJoinRequest(workspaceId: string, requestId: string): Promise<WorkspaceJoinRequest> {
  return requestJson<WorkspaceJoinRequest>(`/api/workspaces/${workspaceId}/requests/${requestId}/approve`, {
    method: 'POST',
  })
}

export async function denyJoinRequest(workspaceId: string, requestId: string): Promise<WorkspaceJoinRequest> {
  return requestJson<WorkspaceJoinRequest>(`/api/workspaces/${workspaceId}/requests/${requestId}/deny`, {
    method: 'POST',
  })
}

export async function cancelOwnJoinRequest(workspaceId: string): Promise<void> {
  await requestJson<void>(`/api/workspaces/${workspaceId}/requests/self/cancel`, {
    method: 'POST',
  })
}

export async function updateWorkspaceSettings(
  workspaceId: string,
  payload: {
    requireApproval?: boolean
    name?: string
    slug?: string
    description?: string
    language?: string
    avatarUrl?: string
    maxProjects?: number | null
    maxMembers?: number | null
    maxTeams?: number | null
    maxStorageMb?: number | null
  }
): Promise<Workspace> {
  return requestJson<Workspace>(`/api/workspaces/${workspaceId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
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

export async function listRoles(workspaceId: string): Promise<WorkspaceRole[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/roles`)
  return asArray<WorkspaceRole>(data)
}

export async function createRole(
  workspaceId: string,
  payload: { name: string; permissions?: WorkspacePermissions }
): Promise<WorkspaceRole> {
  return requestJson<WorkspaceRole>(`/api/workspaces/${workspaceId}/roles`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateRole(
  workspaceId: string,
  roleId: string,
  payload: { name?: string; permissions?: WorkspacePermissions }
): Promise<WorkspaceRole> {
  return requestJson<WorkspaceRole>(`/api/workspaces/${workspaceId}/roles/${roleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function assignMemberRole(workspaceId: string, userId: string, roleId: string): Promise<Workspace> {
  return requestJson<Workspace>(`/api/workspaces/${workspaceId}/members/${userId}/role`, {
    method: 'POST',
    body: JSON.stringify({ roleId }),
  })
}

export async function listWorkspaceAudit(
  workspaceId: string,
  params?: {
    personalOnly?: boolean
    actorUserId?: string
    targetUserId?: string
    teamId?: string
    roleId?: string
    projectId?: string
    category?: string
    action?: string
    from?: string
    to?: string
    q?: string
    limit?: number
  }
): Promise<WorkspaceAuditEvent[]> {
  const query = new URLSearchParams()
  if (params) {
    if (params.personalOnly) query.set('personalOnly', 'true')
    if (params.actorUserId) query.set('actorUserId', params.actorUserId)
    if (params.targetUserId) query.set('targetUserId', params.targetUserId)
    if (params.teamId) query.set('teamId', params.teamId)
    if (params.roleId) query.set('roleId', params.roleId)
    if (params.projectId) query.set('projectId', params.projectId)
    if (params.category) query.set('category', params.category)
    if (params.action) query.set('action', params.action)
    if (params.from) query.set('from', params.from)
    if (params.to) query.set('to', params.to)
    if (params.q) query.set('q', params.q)
    if (typeof params.limit === 'number') query.set('limit', String(params.limit))
  }
  const suffix = query.toString()
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/audit${suffix ? `?${suffix}` : ''}`)
  return asArray<WorkspaceAuditEvent>(data)
}
