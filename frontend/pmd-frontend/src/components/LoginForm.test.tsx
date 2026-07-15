// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { LoginForm } from './LoginForm'
import { ToastProvider } from '../shared/ui/toast/ToastProvider'

// The Google/Turnstile widgets are env-gated, so without this the test depends on whether a
// .env.local happens to define real keys — with Turnstile "enabled" submit bails on the
// missing captcha token and never calls onLogin. Pin them off so the test is deterministic.
vi.mock('../lib/authProviders', () => ({
  GOOGLE_CLIENT_ID: '',
  TURNSTILE_SITE_KEY: '',
  isGoogleEnabled: false,
  isTurnstileEnabled: false,
}))

function renderLogin(onLogin = vi.fn().mockResolvedValue(undefined)) {
  const utils = render(
    <ToastProvider>
      <LoginForm onLogin={onLogin} error={null} loading={false} onSwitchToRegister={() => {}} />
    </ToastProvider>,
  )
  const form = utils.container.querySelector('form') as HTMLFormElement
  return { onLogin, form }
}

describe('LoginForm', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => cleanup())

  it('does not submit and shows field errors when empty', () => {
    const { onLogin, form } = renderLogin()
    fireEvent.submit(form)
    expect(onLogin).not.toHaveBeenCalled()
    expect(screen.getByText('Email is required.')).toBeTruthy()
    expect(screen.getByText('Password is required.')).toBeTruthy()
  })

  it('submits trimmed credentials when valid', () => {
    const onLogin = vi.fn().mockResolvedValue(undefined)
    const { form } = renderLogin(onLogin)
    fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: '  user@example.com  ' } })
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'secret' } })
    fireEvent.submit(form)
    expect(onLogin).toHaveBeenCalledWith({
      username: 'user@example.com',
      password: 'secret',
      remember: false,
      turnstileToken: '',
    })
  })
})
