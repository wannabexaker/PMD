import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  type: ToastType
  message: string
  durationMs: number
}

type ToastInput = {
  type?: ToastType
  message: string
  durationMs?: number
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((toast: ToastInput) => {
    const next: Toast = {
      id: buildId(),
      type: toast.type ?? 'info',
      message: toast.message,
      durationMs: toast.durationMs ?? 3000,
    }
    setToasts((prev) => [...prev, next])
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
