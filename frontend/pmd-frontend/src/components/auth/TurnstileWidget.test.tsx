// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { TurnstileWidget, TURNSTILE_FAILED_MESSAGE } from './TurnstileWidget'

vi.mock('../../lib/authProviders', () => ({
  GOOGLE_CLIENT_ID: '',
  TURNSTILE_SITE_KEY: 'test-site-key',
  isGoogleEnabled: false,
  isTurnstileEnabled: true,
}))

function turnstileScript() {
  return document.querySelector<HTMLScriptElement>('script[src*="challenges.cloudflare.com/turnstile"]')
}

describe('TurnstileWidget', () => {
  afterEach(() => {
    cleanup()
    turnstileScript()?.remove()
  })

  it('says verification could not load and retries with a fresh script', async () => {
    render(<TurnstileWidget onToken={() => {}} />)
    const first = turnstileScript()
    expect(first).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()

    await act(async () => {
      first?.dispatchEvent(new Event('error'))
    })
    expect(screen.getByRole('alert').textContent).toContain(TURNSTILE_FAILED_MESSAGE)
    // The dead tag is gone, so the retry does not wait on it forever.
    expect(turnstileScript()).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /retry verification/i }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(turnstileScript()).toBeTruthy()
  })
})
