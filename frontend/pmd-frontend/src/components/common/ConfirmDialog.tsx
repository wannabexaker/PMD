import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../shared/ui/CloseIcon'

export type ConfirmDialogOptions = {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  /** 'danger' for destructive actions: red confirm button and a warning box. */
  tone?: 'danger' | 'default'
  /** When set, the user must type this exact text before Confirm is enabled (irreversible actions). */
  requireText?: string
}

type ConfirmDialogProps = ConfirmDialogOptions & {
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * One styled confirmation dialog for the app. It reuses the look of the Settings team-edit overlay.
 * Prefer `useConfirmDialog()`, which wraps this in a promise and applies the "Confirm destructive actions" preference.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const inputId = useId()
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const confirmRef = useRef<HTMLButtonElement | null>(null)
  const [typed, setTyped] = useState('')
  const canConfirm = !requireText || typed.trim() === requireText

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    // Destructive dialogs start on Cancel so a stray Enter does not delete anything.
    const initial = requireText ? inputRef.current : tone === 'danger' ? cancelRef.current : confirmRef.current
    initial?.focus()
    return () => {
      previouslyFocused?.focus?.()
    }
  }, [requireText, tone])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className="workspace-profile-overlay confirm-dialog-overlay"
      onClick={(event) => {
        // The portal still bubbles through the React tree; keep clicks away from rows behind the dialog.
        event.stopPropagation()
        if (event.target === event.currentTarget) onCancel()
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={dialogRef}
        className={`workspace-inline-editor workspace-inline-editor-overlay confirm-dialog${tone === 'danger' ? ' is-danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="workspace-inline-editor-header">
          <strong id={titleId}>{title}</strong>
          <button type="button" className="btn btn-ghost btn-icon confirm-dialog-close" onClick={onCancel} aria-label="Close">
            <CloseIcon size={14} />
          </button>
        </div>
        <div className="team-edit-box">
          {message ? (
            <div className={tone === 'danger' ? 'workspace-delete-warning' : 'muted team-edit-note'}>{message}</div>
          ) : null}
          {requireText ? (
            <div className="confirm-dialog-typed">
              <label htmlFor={inputId}>
                Type <strong>{requireText}</strong> to confirm
              </label>
              <input
                id={inputId}
                ref={inputRef}
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && canConfirm) {
                    event.preventDefault()
                    onConfirm()
                  }
                }}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
          ) : null}
          <div className="workspace-inline-actions">
            <button
              ref={confirmRef}
              type="button"
              className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
              onClick={onConfirm}
              disabled={!canConfirm}
            >
              {confirmLabel}
            </button>
            <button ref={cancelRef} type="button" className="btn btn-ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
