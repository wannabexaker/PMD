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

// The form probes the backend on mount. Pin the answer so tests never depend on the network,
// and let individual tests flip it to exercise the demo-offline state.
const backend = vi.hoisted(() => ({ status: 'online' as 'online' | 'offline' }))
vi.mock('../api/backendStatus', () => ({
  getBackendStatus: () => Promise.resolve(backend.status),
  recheckBackendStatus: () => Promise.resolve(backend.status),
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
  beforeEach(() => {
    localStorage.clear()
    backend.status = 'online'
  })

  it('says the demo backend is offline and blocks sign-in instead of failing', async () => {
    backend.status = 'offline'
    const { onLogin, form } = renderLogin()
    expect(await screen.findByText(/backend is offline/i)).toBeTruthy()
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^password/i), { target: { value: 'secret' } })
    fireEvent.submit(form)
    expect(onLogin).not.toHaveBeenCalled()
    expect((screen.getByRole('button', { name: /^login$/i }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows no offline notice when the backend answers', async () => {
    renderLogin()
    await Promise.resolve()
    expect(screen.queryByText(/backend is offline/i)).toBeNull()
  })
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
