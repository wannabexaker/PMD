import { requestJson } from './http'
import type { CommentAttachment } from '../types'

export async function uploadImage(file: File): Promise<CommentAttachment> {
  const formData = new FormData()
  formData.append('file', file)
  return requestJson<CommentAttachment>('/api/uploads', {
    method: 'POST',
    body: formData,
  })
}
