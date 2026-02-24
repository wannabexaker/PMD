import type { CSSProperties } from 'react'

type SavedCropState = { x: number; y: number; zoom: number }

const PROFILE_CROP_STORAGE_KEY = 'pmd.profilePictureCropByUrl'
const WORKSPACE_CROP_STORAGE_KEY = 'pmd.workspacePictureCropByUrl'

function readMap(storageKey: string): Record<string, SavedCropState> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, SavedCropState>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getAvatarFrame(url?: string | null): SavedCropState | null {
  const key = (url ?? '').trim()
  if (!key || typeof window === 'undefined') return null
  const profileMap = readMap(PROFILE_CROP_STORAGE_KEY)
  const clamp = (frame: SavedCropState): SavedCropState => ({
    x: Math.max(0, Math.min(100, Number.isFinite(frame.x) ? frame.x : 50)),
    y: Math.max(0, Math.min(100, Number.isFinite(frame.y) ? frame.y : 50)),
    zoom: Math.max(100, Math.min(220, Number.isFinite(frame.zoom) ? frame.zoom : 100)),
  })
  if (profileMap[key]) return clamp(profileMap[key])
  const workspaceMap = readMap(WORKSPACE_CROP_STORAGE_KEY)
  if (workspaceMap[key]) return clamp(workspaceMap[key])
  return null
}

export function getAvatarFrameStyle(url?: string | null): CSSProperties | undefined {
  const frame = getAvatarFrame(url)
  if (!frame) return undefined
  return {
    ['--avatar-frame-x' as string]: `${frame.x}`,
    ['--avatar-frame-y' as string]: `${frame.y}`,
    ['--avatar-frame-zoom' as string]: `${frame.zoom}`,
  }
}
