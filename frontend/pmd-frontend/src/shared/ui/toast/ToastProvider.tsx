/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon } from '../CloseIcon'

export type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  type: ToastType
  message: string
  durationMs: number
  dedupeKey: string
}

type ToastInput = {
  type?: ToastType
  message: string
  durationMs?: number
  dedupeKey?: string
  suppressWindowMs?: number
}

type ToastContextValue = {
  showToast: (toast: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Errors stay up longer: they usually need reading, and the user may want to act on them.
const DEFAULT_DURATION_MS: Record<ToastType, number> = {
  success: 4000,
  info: 4000,
  error: 7000,
}

function buildId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const recentToastMapRef = useRef<Map<string, number>>(new Map())
  const timersRef = useRef<Map<string, number>>(new Map())

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer != null) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    const type = toast.type ?? 'info'
    const message = toast.message.trim()
    if (!message) {
      return
    }
    const dedupeKey = toast.dedupeKey ?? `${type}:${message.toLowerCase()}`
    const now = Date.now()
    const suppressWindowMs = toast.suppressWindowMs ?? 1800
    const lastShownAt = recentToastMapRef.current.get(dedupeKey)
    if (lastShownAt != null && now - lastShownAt < suppressWindowMs) {
      return
    }
    recentToastMapRef.current.set(dedupeKey, now)
    const next: Toast = {
      id: buildId(),
      type,
      message,
      durationMs: toast.durationMs ?? DEFAULT_DURATION_MS[type],
      dedupeKey,
    }
    setToasts((prev) => {
      if (prev.some((item) => item.dedupeKey === dedupeKey)) {
        return prev
      }
      return [...prev, next].slice(-4)
    })
    timersRef.current.set(next.id, window.setTimeout(() => removeToast(next.id), next.durationMs))
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          role={toast.type === 'error' ? 'alert' : 'status'}
        >
          <span className="toast-message">{toast.message}</span>
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => onDismiss(toast.id)}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
