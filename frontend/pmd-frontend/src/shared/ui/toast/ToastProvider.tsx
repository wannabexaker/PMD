/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

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

function buildId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const recentToastMapRef = useRef<Map<string, number>>(new Map())

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
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
      durationMs: toast.durationMs ?? 3000,
      dedupeKey,
    }
    setToasts((prev) => {
      if (prev.some((item) => item.dedupeKey === dedupeKey)) {
        return prev
      }
      return [...prev, next].slice(-4)
    })
    window.setTimeout(() => removeToast(next.id), next.durationMs)
  }, [removeToast])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
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

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-container" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          <span className="toast-message truncate" title={toast.message}>
            {toast.message}
          </span>
        </div>
      ))}
    </div>
  )
}
