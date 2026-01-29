import { requestJson } from './http'
import type { CommentReactionPayload, CreateProjectCommentPayload, ProjectComment } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchProjectComments(
  workspaceId: string,
  projectId: string
): Promise<ProjectComment[]> {
  const data = await requestJson<unknown>(`/api/workspaces/${workspaceId}/projects/${projectId}/comments`)
  return asArray<ProjectComment>(data)
}

export async function createProjectComment(
  workspaceId: string,
  projectId: string,
  payload: CreateProjectCommentPayload
): Promise<ProjectComment> {
  return requestJson<ProjectComment>(`/api/workspaces/${workspaceId}/projects/${projectId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function toggleCommentReaction(
  workspaceId: string,
  commentId: string,
  payload: CommentReactionPayload
): Promise<ProjectComment> {
  return requestJson<ProjectComment>(`/api/workspaces/${workspaceId}/comments/${commentId}/reactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteComment(workspaceId: string, commentId: string): Promise<void> {
  await requestJson<void>(`/api/workspaces/${workspaceId}/comments/${commentId}`, {
    method: 'DELETE',
  })
}
