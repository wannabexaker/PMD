import { useEffect, useMemo, useState } from 'react'
import type {
  CommentAttachment,
  CommentReactionType,
  CreateProjectCommentPayload,
  ProjectComment,
  User,
} from '../types'
import { createProjectComment, deleteComment, fetchProjectComments, toggleCommentReaction } from '../api/comments'
import { uploadImage } from '../api/uploads'
import { API_BASE_URL } from '../api/http'
import { PmdLoader } from './common/PmdLoader'
import { ImageModal } from './common/ImageModal'

const REACTIONS: { type: CommentReactionType; label: string }[] = [
  { type: 'LIKE', label: 'Like' },
  { type: 'LOVE', label: 'Love' },
  { type: 'LAUGH', label: 'Laugh' },
  { type: 'WOW', label: 'Wow' },
  { type: 'SAD', label: 'Sad' },
]

function formatTimestamp(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function hasUserReacted(reactions: ProjectComment['reactions'], type: CommentReactionType, userId: string) {
  const users = reactions?.[type] ?? []
  return users.includes(userId)
}

function reactionCount(reactions: ProjectComment['reactions'], type: CommentReactionType) {
  return (reactions?.[type] ?? []).length
}

type ProjectCommentsProps = {
  projectId: string
  currentUser: User
}

export function ProjectComments({ projectId, currentUser }: ProjectCommentsProps) {
  const [comments, setComments] = useState<ProjectComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [timeSpentEnabled, setTimeSpentEnabled] = useState(false)
  const [timeSpentMinutes, setTimeSpentMinutes] = useState(15)
  const [attachment, setAttachment] = useState<CommentAttachment | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null)

  const canDelete = useMemo(() => {
    const currentUserId = currentUser.id ?? ''
    return (comment: ProjectComment) =>
      Boolean(comment.authorUserId && comment.authorUserId === currentUserId) ||
      Boolean(currentUser.isAdmin)
  }, [currentUser])

  useEffect(() => {
    if (!projectId) {
      setComments([])
      return
    }
    let active = true
    setLoading(true)
    setError(null)
    fetchProjectComments(projectId)
      .then((data) => {
        if (active) setComments(data)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load comments')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [projectId])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
    }
  }, [localPreviewUrl])

  const handlePost = async () => {
    if (!message.trim()) {
      setError('Comment cannot be empty.')
      return
    }
    const payload: CreateProjectCommentPayload = {
      message: message.trim(),
      timeSpentMinutes: timeSpentEnabled ? timeSpentMinutes : undefined,
      attachment: attachment ?? undefined,
    }
    try {
      setPosting(true)
      setError(null)
      const created = await createProjectComment(projectId, payload)
      setComments((prev) => [created, ...prev])
      setMessage('')
      setTimeSpentEnabled(false)
      setAttachment(null)
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
        setLocalPreviewUrl(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setPosting(false)
    }
  }

  const handleReaction = async (comment: ProjectComment, type: CommentReactionType) => {
    try {
      const updated = await toggleCommentReaction(comment.id, { type })
      setComments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reaction')
    }
  }

  const handleDelete = async (comment: ProjectComment) => {
    try {
      await deleteComment(comment.id)
      setComments((prev) => prev.filter((item) => item.id !== comment.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment')
    }
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setUploading(true)
      setError(null)
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl)
      }
      const objectUrl = URL.createObjectURL(file)
      setLocalPreviewUrl(objectUrl)
      const uploaded = await uploadImage(file)
      setAttachment(uploaded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const resolveAttachmentUrl = (url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }
    const prefix = url.startsWith('/') ? '' : '/'
    return `${API_BASE_URL}${prefix}${url}`
  }

  const currentUserId = currentUser.id ?? ''

  return (
    <div className="card comments-card">
      <div className="panel-header">
        <h3>Comments</h3>
        <span className="muted">{comments.length}</span>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="comment-composer">
        <textarea
          rows={3}
          placeholder="Write a comment..."
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        {attachment || localPreviewUrl ? (
          <div className="comment-attachment-preview">
            <img
              src={localPreviewUrl ?? resolveAttachmentUrl(attachment?.url)}
              alt={attachment?.fileName ?? 'Attachment preview'}
              onClick={() => {
                const url = localPreviewUrl ?? resolveAttachmentUrl(attachment?.url)
                if (url) {
                  setPreviewUrl(url)
                }
              }}
              onError={() => {
                console.error('Failed to preview attachment')
                setError('Failed to preview attachment.')
              }}
            />
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setAttachment(null)
                if (localPreviewUrl) {
                  URL.revokeObjectURL(localPreviewUrl)
                  setLocalPreviewUrl(null)
                }
              }}
            >
              Remove
            </button>
          </div>
        ) : null}
        <div className="comment-actions">
          <div className="comment-actions-left">
            <label className="btn btn-ghost comment-attach">
              {uploading ? 'Uploading...' : 'Attach image'}
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} />
            </label>
            <button
              type="button"
              className={`btn btn-ghost${timeSpentEnabled ? ' is-active' : ''}`}
              onClick={() => setTimeSpentEnabled((prev) => !prev)}
            >
              Time spent
            </button>
            {timeSpentEnabled ? (
              <input
                type="number"
                min={1}
                max={1440}
                className="comment-time-input"
                value={timeSpentMinutes}
                onChange={(event) => setTimeSpentMinutes(Number(event.target.value))}
              />
            ) : null}
          </div>
          <button type="button" className="btn btn-primary" onClick={handlePost} disabled={posting}>
            {posting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      <div className="comment-list">
        {loading ? <PmdLoader size="sm" variant="inline" /> : null}
        {!loading && comments.length === 0 ? <p className="muted">No comments yet.</p> : null}
        {comments.map((item) => (
          <div key={item.id} className="comment-item">
            <div className="comment-meta">
              <strong className="truncate" title={item.authorName}>
                {item.authorName}
              </strong>
              <span className="muted">{formatTimestamp(item.createdAt)}</span>
              {canDelete(item) ? (
                <button type="button" className="btn btn-ghost" onClick={() => handleDelete(item)}>
                  Delete
                </button>
              ) : null}
            </div>
            <p className="comment-text">{item.message}</p>
            {item.timeSpentMinutes ? (
              <span className="comment-time">Time spent: {item.timeSpentMinutes} min</span>
            ) : null}
            {item.attachment ? (
              <div className="comment-attachment">
                <img
                  src={resolveAttachmentUrl(item.attachment.url)}
                  alt={item.attachment.fileName}
                  onClick={() => setPreviewUrl(resolveAttachmentUrl(item.attachment?.url))}
                  onError={() => {
                    console.error('Failed to load attachment image')
                    setError('Failed to load attachment image.')
                  }}
                />
              </div>
            ) : null}
            <div className="comment-reactions">
              {REACTIONS.map((reaction) => {
                const count = reactionCount(item.reactions, reaction.type)
                const active = currentUserId && hasUserReacted(item.reactions, reaction.type, currentUserId)
                return (
                  <button
                    key={reaction.type}
                    type="button"
                    className={`reaction-pill${active ? ' active' : ''}`}
                    onClick={() => handleReaction(item, reaction.type)}
                  >
                    {reaction.label}
                    {count > 0 ? <span>{count}</span> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {previewUrl ? <ImageModal src={previewUrl} onClose={() => setPreviewUrl(null)} /> : null}
    </div>
  )
}
