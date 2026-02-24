import { useEffect, useMemo, useRef, useState } from 'react'
import type { DashboardStatsResponse, UpdateProfilePayload, User, UserStatsResponse } from '../types'
import { updateProfile } from '../api/auth'
import { uploadImage } from '../api/uploads'
import { API_BASE_URL } from '../api/http'
import { useTeams } from '../teams/TeamsContext'
import { fetchMyUserStats } from '../api/stats'
import { fetchMyDashboardStats } from '../api/projects'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { getAvatarFrameStyle } from '../shared/avatarFrame'

type ProfilePanelProps = {
  user: User
  onSaved: (user: User) => void
  onClose: () => void
}

type SavedCropState = { x: number; y: number; zoom: number }
const PROFILE_CROP_STORAGE_KEY = 'pmd.profilePictureCropByUrl'

function loadSavedCropMap(storageKey: string): Record<string, SavedCropState> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SavedCropState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function ProfilePanel({ user, onSaved, onClose }: ProfilePanelProps) {
  const { teams, loading: teamsLoading } = useTeams()
  const { activeWorkspaceId } = useWorkspace()
  const [form, setForm] = useState<UpdateProfilePayload>({
    email: user.email ?? user.username ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    teamId: user.teamId ?? '',
    bio: user.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false)
  const [avatarUrlDraft, setAvatarUrlDraft] = useState(user.avatarUrl ?? '')
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null)
  const [avatarCropPreviewUrl, setAvatarCropPreviewUrl] = useState('')
  const [avatarCropX, setAvatarCropX] = useState(50)
  const [avatarCropY, setAvatarCropY] = useState(50)
  const [avatarCropZoom, setAvatarCropZoom] = useState(100)
  const [avatarCropSourceUrl, setAvatarCropSourceUrl] = useState<string | null>(null)
  const [savedCropByUrl, setSavedCropByUrl] = useState<Record<string, SavedCropState>>(() =>
    loadSavedCropMap(PROFILE_CROP_STORAGE_KEY)
  )
  const [pmdImages, setPmdImages] = useState<string[]>([])
  const [pmdImagesOpen, setPmdImagesOpen] = useState(false)
  const cropDragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)
  const [myStats, setMyStats] = useState<UserStatsResponse | null>(null)
  const [myStatsError, setMyStatsError] = useState<string | null>(null)
  const [myDashboardStats, setMyDashboardStats] = useState<DashboardStatsResponse | null>(null)
  const [myDashboardError, setMyDashboardError] = useState<string | null>(null)

  const resolveAssetUrl = (url?: string | null) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://')) return url
    const prefix = url.startsWith('/') ? '' : '/'
    return `${API_BASE_URL}${prefix}${url}`
  }

  const isDirty = useMemo(() => {
    const initialEmail = user.email ?? user.username ?? ''
    const initialFirstName = user.firstName ?? ''
    const initialLastName = user.lastName ?? ''
    const initialTeam = user.teamId ?? ''
    const initialBio = user.bio ?? ''
    return (
      form.email !== initialEmail ||
      form.firstName !== initialFirstName ||
      form.lastName !== initialLastName ||
      form.teamId !== initialTeam ||
      (form.bio ?? '') !== initialBio
    )
  }, [form, user])

  const handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = (
    event
  ) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setError('Email, name, and surname are required.')
      return
    }

    if ((form.bio ?? '').length > 256) {
      setError('Bio must be 256 characters or less.')
      return
    }

    try {
      setSaving(true)
      if (!form.teamId) {
        setError('Please select a team.')
        return
      }

      const updated = await updateProfile({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        teamId: form.teamId,
        bio: form.bio?.trim() || '',
        avatarUrl: (avatarUrlDraft ?? '').trim(),
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarSave = async (nextAvatarUrl: string) => {
    setAvatarSaving(true)
    setAvatarError(null)
    try {
      const updated = await updateProfile({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        teamId: form.teamId,
        bio: form.bio?.trim() || '',
        avatarUrl: nextAvatarUrl.trim(),
      })
      setAvatarUrlDraft(updated.avatarUrl ?? '')
      setForm((prev) => ({
        ...prev,
        email: updated.email ?? updated.username ?? prev.email,
        firstName: updated.firstName ?? prev.firstName,
        lastName: updated.lastName ?? prev.lastName,
        teamId: updated.teamId ?? prev.teamId,
        bio: updated.bio ?? prev.bio ?? '',
      }))
      onSaved(updated)
      setAvatarEditorOpen(false)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to save avatar')
    } finally {
      setAvatarSaving(false)
    }
  }

  const handleAvatarFileUpload: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setAvatarError('Use PNG, JPG, or WEBP.')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Max file size is 2MB.')
      event.target.value = ''
      return
    }
    setAvatarCropFile(file)
    setAvatarCropPreviewUrl(URL.createObjectURL(file))
    setAvatarCropX(50)
    setAvatarCropY(50)
    setAvatarCropZoom(100)
    setAvatarCropSourceUrl(null)
    setAvatarError(null)
    event.target.value = ''
  }

  const handleOpenCropFromCurrentAvatar = async () => {
    const currentUrl = avatarUrlDraft.trim()
    if (!currentUrl) return
    try {
      setAvatarError(null)
      const response = await fetch(resolveAssetUrl(currentUrl), { credentials: 'include' })
      if (!response.ok) {
        throw new Error('Could not load current photo for crop.')
      }
      const blob = await response.blob()
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
      const file = new File([blob], `profile-picture.${extension}`, { type: blob.type || 'image/jpeg' })
      setAvatarCropFile(file)
      setAvatarCropPreviewUrl(URL.createObjectURL(file))
      const saved = savedCropByUrl[currentUrl]
      setAvatarCropX(saved?.x ?? 50)
      setAvatarCropY(saved?.y ?? 50)
      setAvatarCropZoom(saved?.zoom ?? 100)
      setAvatarCropSourceUrl(currentUrl)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to open crop editor.')
    }
  }

  const applyAvatarCropAndUpload = async () => {
    if (!avatarCropFile) return
    try {
      setAvatarUploading(true)
      setAvatarError(null)
      let nextUrl = avatarCropSourceUrl?.trim() ?? ''
      if (!nextUrl) {
        // Frame-mode behavior: upload original image (no real crop) and persist POV separately.
        const uploaded = await uploadImage(avatarCropFile)
        nextUrl = (uploaded.url ?? '').trim()
      }
      setAvatarUrlDraft(nextUrl)
      if (nextUrl) {
        setSavedCropByUrl((prev) => ({
          ...prev,
          [nextUrl]: { x: avatarCropX, y: avatarCropY, zoom: avatarCropZoom },
        }))
      }
      URL.revokeObjectURL(avatarCropPreviewUrl)
      setAvatarCropPreviewUrl('')
      setAvatarCropFile(null)
      setAvatarCropSourceUrl(null)
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
    }
  }

  useEffect(() => {
    setAvatarUrlDraft(user.avatarUrl ?? '')
  }, [user.avatarUrl])

  useEffect(() => {
    let active = true
    fetch('/profile-pictures/index.json')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!active) return
        const files = Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
        setPmdImages(files)
      })
      .catch(() => {
        if (active) setPmdImages([])
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (avatarCropPreviewUrl) {
        URL.revokeObjectURL(avatarCropPreviewUrl)
      }
    }
  }, [avatarCropPreviewUrl])

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_CROP_STORAGE_KEY, JSON.stringify(savedCropByUrl))
    } catch {
      // ignore storage errors
    }
  }, [savedCropByUrl])

  const handleCropPointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!avatarCropPreviewUrl) return
    const element = event.currentTarget
    cropDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: avatarCropX,
      baseY: avatarCropY,
    }
    element.setPointerCapture(event.pointerId)
  }

  const handleCropPointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const state = cropDragRef.current
    if (!state) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    const frameSize = Math.max(1, event.currentTarget.getBoundingClientRect().width)
    const step = 100 / frameSize
    const nextX = Math.max(0, Math.min(100, state.baseX - dx * step))
    const nextY = Math.max(0, Math.min(100, state.baseY - dy * step))
    setAvatarCropX(nextX)
    setAvatarCropY(nextY)
  }

  const handleCropPointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (cropDragRef.current) {
      cropDragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleCropWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -4 : 4
    setAvatarCropZoom((prev) => Math.max(100, Math.min(220, prev + delta)))
  }

  useEffect(() => {
    let active = true
    setMyStatsError(null)
    if (!activeWorkspaceId) {
      setMyStats(null)
      return () => {
        active = false
      }
    }
    fetchMyUserStats(activeWorkspaceId)
      .then((data) => {
        if (active) setMyStats(data)
      })
      .catch((err) => {
        if (active) setMyStatsError(err instanceof Error ? err.message : 'Failed to load my stats')
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    let active = true
    setMyDashboardError(null)
    if (!activeWorkspaceId) {
      setMyDashboardStats(null)
      return () => {
        active = false
      }
    }
    fetchMyDashboardStats(activeWorkspaceId)
      .then((data) => {
        if (active) setMyDashboardStats(data)
      })
      .catch((err) => {
        if (active) setMyDashboardError(err instanceof Error ? err.message : 'Failed to load dashboard stats')
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  return (
    <div className="profile-panel">
      <div className="panel-header">
        <h3>My Profile</h3>
      </div>
      {avatarEditorOpen ? (
        <div className="modal-overlay profile-avatar-context-overlay" onClick={() => setAvatarEditorOpen(false)}>
          <div className="modal avatar-editor-modal profile-avatar-context-window" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="avatar-editor-close"
              aria-label="Close avatar editor"
              onClick={() => setAvatarEditorOpen(false)}
            >
              ×
            </button>
            <div className="workspace-profile-avatar-panel profile-avatar-editor-panel">
              <div className="workspace-profile-avatar-preview">
                <span className="workspace-avatar workspace-avatar-xl workspace-avatar-edit-preview" aria-hidden="true">
                  {avatarUrlDraft ? (
                    <img
                      src={resolveAssetUrl(avatarUrlDraft)}
                      alt=""
                      className="framed-avatar-image"
                      style={getAvatarFrameStyle(avatarUrlDraft)}
                      draggable={false}
                      onContextMenu={(event) => event.preventDefault()}
                    />
                  ) : (
                    <span>{(user.displayName ?? user.username ?? 'U').slice(0, 1).toUpperCase()}</span>
                  )}
                </span>
                {avatarUrlDraft.trim() ? (
                  <button
                    type="button"
                    className="avatar-thumb-delete"
                    title="Delete photo"
                    aria-label="Delete photo"
                    onClick={() => {
                      const ok = window.confirm('Delete profile photo?')
                      if (!ok) return
                      void handleAvatarSave('')
                    }}
                    disabled={avatarUploading || avatarSaving}
                  >
                    ×
                  </button>
                ) : null}
              </div>
              <div className="workspace-profile-avatar-actions">
                <label htmlFor="profileAvatarUrl">Photo from link</label>
                <input
                  id="profileAvatarUrl"
                  value={avatarUrlDraft}
                  onChange={(event) => setAvatarUrlDraft(event.target.value)}
                  placeholder="https://..."
                />
                <p className="muted">PNG/JPG/WEBP up to 2MB</p>
                {avatarError ? <p className="error">{avatarError}</p> : null}
                <div className="workspace-profile-avatar-actions-row">
                  <label className="btn btn-secondary workspace-profile-avatar-button">
                    {avatarUploading ? 'Uploading...' : 'Upload image'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarFileUpload}
                      style={{ display: 'none' }}
                      disabled={avatarUploading || avatarSaving}
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={avatarUploading || avatarSaving || !avatarUrlDraft.trim()}
                    onClick={() => void handleOpenCropFromCurrentAvatar()}
                  >
                    Adjust crop
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={avatarUploading || avatarSaving}
                    onClick={() => void handleAvatarSave(avatarUrlDraft)}
                  >
                    {avatarSaving ? 'Saving...' : 'Save avatar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={avatarUploading || avatarSaving || pmdImages.length === 0}
                    onClick={() => setPmdImagesOpen((prev) => !prev)}
                  >
                    PMD images
                  </button>
                </div>
                {pmdImagesOpen ? (
                  <div className="pmd-images-grid" role="list" aria-label="PMD profile images">
                    {pmdImages.map((fileName) => (
                      <button
                        key={fileName}
                        type="button"
                        className="pmd-image-thumb"
                        title={fileName}
                        onClick={() => {
                          setAvatarUrlDraft(`/profile-pictures/${fileName}`)
                          setPmdImagesOpen(false)
                        }}
                      >
                        <img src={`/profile-pictures/${fileName}`} alt={fileName} loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {avatarCropPreviewUrl ? (
        <div className="modal-overlay profile-avatar-context-overlay" onClick={() => {
          URL.revokeObjectURL(avatarCropPreviewUrl)
          setAvatarCropPreviewUrl('')
          setAvatarCropFile(null)
          setAvatarCropSourceUrl(null)
        }}>
          <div className="modal avatar-editor-modal profile-avatar-context-window" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="avatar-editor-close"
              aria-label="Close crop editor"
              onClick={() => {
                URL.revokeObjectURL(avatarCropPreviewUrl)
                setAvatarCropPreviewUrl('')
                setAvatarCropFile(null)
                setAvatarCropSourceUrl(null)
              }}
            >
              ×
            </button>
            <div className="avatar-crop-body">
              <h4>Adjust thumbnail</h4>
              <p className="muted">Drag with cursor (hand) to position. Use zoom for framing.</p>
              <div
                className="avatar-crop-preview avatar-crop-draggable"
                style={
                  {
                    ['--avatar-crop-x' as string]: `${avatarCropX}`,
                    ['--avatar-crop-y' as string]: `${avatarCropY}`,
                    ['--avatar-crop-zoom' as string]: `${avatarCropZoom}`,
                  }
                }
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
                onWheel={handleCropWheel}
              >
                <span className="workspace-avatar workspace-avatar-xl" aria-hidden="true">
                  <img src={avatarCropPreviewUrl} alt="" draggable={false} onDragStart={(event) => event.preventDefault()} />
                </span>
              </div>
              <div className="avatar-crop-sliders">
                <label>
                  Horizontal
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={avatarCropX}
                    onChange={(event) => setAvatarCropX(Number(event.target.value))}
                    disabled={avatarUploading}
                  />
                </label>
                <label>
                  Vertical
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={avatarCropY}
                    onChange={(event) => setAvatarCropY(Number(event.target.value))}
                    disabled={avatarUploading}
                  />
                </label>
                <label>
                  Zoom
                  <input
                    type="range"
                    min={100}
                    max={220}
                    step={1}
                    value={avatarCropZoom}
                    onChange={(event) => setAvatarCropZoom(Number(event.target.value))}
                    disabled={avatarUploading}
                  />
                </label>
              </div>
              <div className="workspace-profile-avatar-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    URL.revokeObjectURL(avatarCropPreviewUrl)
                    setAvatarCropPreviewUrl('')
                    setAvatarCropFile(null)
                    setAvatarCropSourceUrl(null)
                  }}
                  disabled={avatarUploading}
                >
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={applyAvatarCropAndUpload} disabled={avatarUploading}>
                  {avatarUploading ? 'Uploading...' : 'Use image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-grid two-col">
          <div className="form-field form-span-2 profile-form-header">
            <button
              type="button"
              className={`workspace-profile-avatar-button profile-avatar-trigger${avatarEditorOpen ? ' is-open' : ''}`}
              onClick={() => setAvatarEditorOpen((open) => !open)}
              aria-label="Edit profile avatar"
              title={avatarEditorOpen ? 'Close avatar editor' : 'Edit avatar'}
            >
              <span className="workspace-avatar workspace-avatar-xl" aria-hidden="true">
                {avatarUrlDraft ? (
                  <img
                    src={resolveAssetUrl(avatarUrlDraft)}
                    alt=""
                    className="framed-avatar-image"
                    style={getAvatarFrameStyle(avatarUrlDraft)}
                    draggable={false}
                    onContextMenu={(event) => event.preventDefault()}
                  />
                ) : (
                  <span>{(user.displayName ?? user.username ?? 'U').slice(0, 1).toUpperCase()}</span>
                )}
              </span>
              <span className="profile-avatar-overlay-icon" aria-hidden="true">
                {avatarEditorOpen ? 'x' : 'E'}
              </span>
            </button>
            <div className="profile-name-inputs">
              <div className="form-field">
                <label htmlFor="profileFirstName">Name</label>
                <input id="profileFirstName" name="firstName" value={form.firstName} onChange={handleChange} />
              </div>
              <div className="form-field">
                <label htmlFor="profileLastName">Surname</label>
                <input id="profileLastName" name="lastName" value={form.lastName} onChange={handleChange} />
              </div>
            </div>
          </div>
          <div className="form-field form-span-2">
            <label htmlFor="profileEmail">Email</label>
            <input id="profileEmail" name="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-field form-span-2">
            <label htmlFor="profileTeam">Team</label>
            <select
              id="profileTeam"
              name="teamId"
              value={form.teamId ?? ''}
              onChange={handleChange}
              disabled={teamsLoading && teams.length === 0}
            >
              <option value="">{teamsLoading ? 'Loading teams...' : 'Select team'}</option>
              {teams.map((team) => (
                <option key={team.id ?? team.name} value={team.id ?? ''}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field form-span-2">
            <label htmlFor="profileBio">Bio</label>
          <textarea
            id="profileBio"
            name="bio"
            value={form.bio ?? ''}
            onChange={handleChange}
            rows={3}
            maxLength={256}
          />
          <span className="muted">{(form.bio ?? '').length}/256</span>
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="form-actions">
          {!isDirty && !saving ? <p className="muted">No changes to save.</p> : null}
          <div className="actions-right">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
      <div className="card profile-stats-card">
        <div className="panel-header">
          <h4>My stats</h4>
        </div>
        {myStatsError ? <p className="error">{myStatsError}</p> : null}
        {!myStats ? (
          <p className="muted">Loading stats...</p>
        ) : (
          <div className="stats-strip">
            {(myStats.statusBreakdown ?? []).map((slice) => (
              <div key={slice.label} className="stat">
                <span className="muted">{slice.label}</span>
                <strong>{slice.value}</strong>
              </div>
            ))}
            {(myStats.activeInactiveBreakdown ?? []).map((slice) => (
              <div key={`ai-${slice.label}`} className="stat">
                <span className="muted">{slice.label}</span>
                <strong>{slice.value}</strong>
              </div>
            ))}
            {myStats.teamAverages ? (
              <div className="stat">
                <span className="muted">Team avg active</span>
                <strong>{myStats.teamAverages.activeProjects.toFixed(1)}</strong>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="card profile-stats-card">
        <div className="panel-header">
          <h4>My dashboard stats</h4>
        </div>
        {myDashboardError ? <p className="error">{myDashboardError}</p> : null}
        {!myDashboardStats ? (
          <p className="muted">Loading dashboard stats...</p>
        ) : (
          <div className="stats-strip">
            {(myDashboardStats.statusBreakdown ?? []).map((slice) => (
              <div key={`my-${slice.label}`} className="stat">
                <span className="muted">{slice.label}</span>
                <strong>{slice.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
