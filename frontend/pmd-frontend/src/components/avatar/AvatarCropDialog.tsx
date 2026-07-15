import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AVATAR_ACCEPT,
  AVATAR_MAX_MB,
  AVATAR_ZOOM_MAX,
  AVATAR_ZOOM_MIN,
  cropAvatarSquare,
  validateAvatarFile,
} from '../../shared/avatarCrop'
import { CloseIcon } from '../../shared/ui/CloseIcon'

export type AvatarCrop = { x: number; y: number; zoom: number }

type AvatarCropDialogProps = {
  /** Image to frame. Only read when the dialog mounts; replacing happens inside. */
  file: File
  title?: string
  /** Framing to start from — carries a legacy stored crop into the baked file. */
  initialCrop?: AvatarCrop
  busy?: boolean
  onCancel: () => void
  /** Receives the cropped square; the caller uploads it. */
  onApply: (cropped: File) => void | Promise<void>
}

const clampPercent = (value: number) => Math.max(0, Math.min(100, value))

export function AvatarCropDialog({
  file,
  title = 'Adjust your photo',
  initialCrop,
  busy = false,
  onCancel,
  onApply,
}: AvatarCropDialogProps) {
  const [workingFile, setWorkingFile] = useState(file)
  const [x, setX] = useState(initialCrop?.x ?? 50)
  const [y, setY] = useState(initialCrop?.y ?? 50)
  const [zoom, setZoom] = useState(initialCrop?.zoom ?? AVATAR_ZOOM_MIN)
  const [error, setError] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null)

  // useMemo + a revoke-on-change effect, rather than setState in an effect.
  const previewUrl = useMemo(() => URL.createObjectURL(workingFile), [workingFile])
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl])

  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancelRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const acceptFile = (next?: File | null) => {
    if (!next) return
    const problem = validateAvatarFile(next)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setWorkingFile(next)
    setX(50)
    setY(50)
    setZoom(AVATAR_ZOOM_MIN)
  }

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (busy) return
    dragRef.current = { startX: event.clientX, startY: event.clientY, baseX: x, baseY: y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    const state = dragRef.current
    if (!state) return
    const frameSize = Math.max(1, event.currentTarget.getBoundingClientRect().width)
    const step = 100 / frameSize
    setX(clampPercent(state.baseX - (event.clientX - state.startX) * step))
    setY(clampPercent(state.baseY - (event.clientY - state.startY) * step))
  }

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!dragRef.current) return
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (busy) return
    setZoom((prev) => Math.max(AVATAR_ZOOM_MIN, Math.min(AVATAR_ZOOM_MAX, prev + (event.deltaY > 0 ? -4 : 4))))
  }

  const handleApply = async () => {
    try {
      setError(null)
      const cropped = await cropAvatarSquare(workingFile, { xPercent: x, yPercent: y, zoomPercent: zoom })
      await onApply(cropped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not process that image.')
    }
  }

  const isDefaultFraming = x === 50 && y === 50 && zoom === AVATAR_ZOOM_MIN

  return (
    <div className="modal-overlay avatar-crop-overlay" onClick={busy ? undefined : onCancel}>
      <div
        className="modal avatar-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-crop-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="avatar-crop-header">
          <h4 id="avatar-crop-title">{title}</h4>
          <button
            type="button"
            className="avatar-crop-close"
            aria-label="Close"
            onClick={onCancel}
            disabled={busy}
          >
            <CloseIcon />
          </button>
        </div>

        <div
          className={dropActive ? 'avatar-crop-stage is-drop-active' : 'avatar-crop-stage'}
          style={
            {
              ['--avatar-crop-x' as string]: `${x}`,
              ['--avatar-crop-y' as string]: `${y}`,
              ['--avatar-crop-zoom' as string]: `${zoom}`,
            } as React.CSSProperties
          }
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onDragOver={(event) => {
            event.preventDefault()
            if (!busy) setDropActive(true)
          }}
          onDragLeave={() => setDropActive(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDropActive(false)
            if (!busy) acceptFile(event.dataTransfer.files?.[0])
          }}
        >
          <img src={previewUrl} alt="" draggable={false} onDragStart={(event) => event.preventDefault()} />
          {/* Square = what gets saved; the ring shows the circle other people will see. */}
          <span className="avatar-crop-mask" aria-hidden="true" />
          <span className="avatar-crop-drop-hint" aria-hidden="true">
            Drop to replace
          </span>
        </div>

        <p className="avatar-crop-help muted">Drag to reposition · scroll to zoom</p>

        <div className="avatar-crop-zoom">
          <label htmlFor="avatar-crop-zoom-range">Zoom</label>
          <input
            id="avatar-crop-zoom-range"
            type="range"
            min={AVATAR_ZOOM_MIN}
            max={AVATAR_ZOOM_MAX}
            step={1}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={busy}
          />
          <button
            type="button"
            className="btn btn-ghost avatar-crop-reset"
            onClick={() => {
              setX(50)
              setY(50)
              setZoom(AVATAR_ZOOM_MIN)
            }}
            disabled={busy || isDefaultFraming}
          >
            Reset
          </button>
        </div>

        {error ? <p className="avatar-crop-error">{error}</p> : null}

        <div className="avatar-crop-actions">
          <div className="avatar-crop-source">
            <label className="btn btn-secondary avatar-crop-replace">
              Choose another
              <input
                type="file"
                accept={AVATAR_ACCEPT}
                onChange={(event) => {
                  acceptFile(event.target.files?.[0])
                  event.target.value = ''
                }}
                disabled={busy}
              />
            </label>
            <span className="avatar-crop-formats muted">PNG, JPG or WEBP · up to {AVATAR_MAX_MB}MB</span>
          </div>
          <div className="avatar-crop-confirm">
            <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void handleApply()} disabled={busy}>
              {busy ? 'Uploading...' : 'Use photo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
