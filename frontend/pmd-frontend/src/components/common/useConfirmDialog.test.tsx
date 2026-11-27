// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { useEffect } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useConfirmDialog } from './useConfirmDialog'
import type { ConfirmDialogOptions } from './ConfirmDialog'

const PREFS_KEY = 'pmd_ui_preferences_v2'

function setup() {
  const apiRef: { current: ReturnType<typeof useConfirmDialog> | null } = { current: null }
  function Host() {
    const hook = useConfirmDialog()
    useEffect(() => {
      apiRef.current = hook
    })
    return <>{hook.dialog}</>
  }
  render(<Host />)
  const ask = (kind: 'confirm' | 'confirmDestructive', options: ConfirmDialogOptions) => {
    let result!: Promise<boolean>
    act(() => {
      result = apiRef.current![kind](options)
    })
    return result
  }
  return { ask }
}

describe('useConfirmDialog', () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('resolves true on confirm and false on cancel', async () => {
    const { ask } = setup()
    const yes = ask('confirmDestructive', { title: 'Delete comment?', confirmLabel: 'Delete comment' })
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    fireEvent.click(screen.getByText('Delete comment'))
    await expect(yes).resolves.toBe(true)
    expect(screen.queryByRole('alertdialog')).toBeNull()

    const no = ask('confirmDestructive', { title: 'Delete comment?', confirmLabel: 'Delete comment' })
    fireEvent.click(screen.getByText('Cancel'))
    await expect(no).resolves.toBe(false)
  })

  it('cancels on Escape', async () => {
    const { ask } = setup()
    const result = ask('confirm', { title: 'Discard changes?' })
    fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })
    await expect(result).resolves.toBe(false)
  })

  it('skips the dialog when "Confirm destructive actions" is off', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ confirmDestructiveActions: false }))
    const { ask } = setup()
    await expect(ask('confirmDestructive', { title: 'Delete comment?' })).resolves.toBe(true)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('always asks for a typed confirmation and enables Confirm only on an exact match', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ confirmDestructiveActions: false }))
    const { ask } = setup()
    const result = ask('confirmDestructive', {
      title: 'Delete your account?',
      confirmLabel: 'Delete my account',
      requireText: 'DELETE',
    })
    const button = screen.getByText('Delete my account') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: 'delete' } })
    expect(button.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/to confirm/i), { target: { value: 'DELETE' } })
    expect(button.disabled).toBe(false)
    fireEvent.click(button)
    await expect(result).resolves.toBe(true)
  })
})
