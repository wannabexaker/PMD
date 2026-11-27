// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { ToastProvider, useToast, type ToastType } from './ToastProvider'

function Trigger({ type, message }: { type: ToastType; message: string }) {
  const { showToast } = useToast()
  return (
    <button type="button" onClick={() => showToast({ type, message })}>
      fire
    </button>
  )
}

function renderWith(type: ToastType, message: string) {
  render(
    <ToastProvider>
      <Trigger type={type} message={message} />
    </ToastProvider>,
  )
  fireEvent.click(screen.getByText('fire'))
}

describe('ToastProvider', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('announces errors as alerts and other toasts as status', () => {
    renderWith('error', 'Something failed')
    expect(screen.getByRole('alert').textContent).toContain('Something failed')
    cleanup()
    renderWith('success', 'Saved')
    expect(screen.getByRole('status').textContent).toContain('Saved')
  })

  it('closes on the dismiss button', () => {
    renderWith('info', 'Hello')
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('keeps errors up longer than success messages', () => {
    vi.useFakeTimers()
    renderWith('error', 'Failed')
    act(() => {
      vi.advanceTimersByTime(4500)
    })
    expect(screen.queryByRole('alert')).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
