import { requestJson } from './http'
import type { CommentReactionPayload, CreateProjectCommentPayload, ProjectComment } from '../types'

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export async function fetchProjectComments(projectId: string): Promise<ProjectComment[]> {
  const data = await requestJson<unknown>(`/api/projects/${projectId}/comments`)
  return asArray<ProjectComment>(data)
}

export async function createProjectComment(
  projectId: string,
  payload: CreateProjectCommentPayload
): Promise<ProjectComment> {
  return requestJson<ProjectComment>(`/api/projects/${projectId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function toggleCommentReaction(
  commentId: string,
  payload: CommentReactionPayload
): Promise<ProjectComment> {
  return requestJson<ProjectComment>(`/api/comments/${commentId}/reactions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteComment(commentId: string): Promise<void> {
  await requestJson<void>(`/api/comments/${commentId}`, {
    method: 'DELETE',
  })
}
