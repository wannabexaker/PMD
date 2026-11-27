import { useCallback, useRef, useState } from 'react'
import { loadUiPreferences } from '../../ui/uiPreferences'
import { ConfirmDialog, type ConfirmDialogOptions } from './ConfirmDialog'

type PendingRequest = ConfirmDialogOptions & { resolve: (confirmed: boolean) => void }

/**
 * Promise-based confirmation. Render `dialog` once in the component, then:
 *
 *   if (!(await confirmDestructive({ title: 'Delete comment?', confirmLabel: 'Delete' }))) return
 *
 * - `confirm` always asks.
 * - `confirmDestructive` asks with the danger tone, unless the user turned off
 *   Settings > Preferences > "Confirm destructive actions". A typed confirmation (`requireText`) always asks.
 */
export function useConfirmDialog() {
  const [pending, setPending] = useState<PendingRequest | null>(null)
  const pendingRef = useRef<PendingRequest | null>(null)

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    // A second request replaces the first; settle the first as cancelled so its caller does not hang.
    pendingRef.current?.resolve(false)
    return new Promise<boolean>((resolve) => {
      const request = { ...options, resolve }
      pendingRef.current = request
      setPending(request)
    })
  }, [])

  const confirmDestructive = useCallback(
    (options: ConfirmDialogOptions) => {
      if (!options.requireText && !loadUiPreferences().confirmDestructiveActions) {
        return Promise.resolve(true)
      }
      return confirm({ tone: 'danger', ...options })
    },
    [confirm]
  )

  const settle = (confirmed: boolean) => {
    const request = pendingRef.current
    pendingRef.current = null
    setPending(null)
    request?.resolve(confirmed)
  }

  const dialog = pending ? (
    <ConfirmDialog
      key={pending.title}
      title={pending.title}
      message={pending.message}
      confirmLabel={pending.confirmLabel}
      cancelLabel={pending.cancelLabel}
      tone={pending.tone}
      requireText={pending.requireText}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  ) : null

  return { confirm, confirmDestructive, dialog }
}
