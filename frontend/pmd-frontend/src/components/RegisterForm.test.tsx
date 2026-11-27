// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { RegisterForm } from './RegisterForm'
import { ToastProvider } from '../shared/ui/toast/ToastProvider'
import type { RegisterResponse } from '../types'

vi.mock('../lib/authProviders', () => ({
  GOOGLE_CLIENT_ID: '',
  TURNSTILE_SITE_KEY: '',
  isGoogleEnabled: false,
  isTurnstileEnabled: false,
}))

vi.mock('../api/backendStatus', () => ({
  getBackendStatus: () => Promise.resolve('online'),
  recheckBackendStatus: () => Promise.resolve('online'),
}))

const GOOD_PASSWORD = 'Str0ng!Passw0rd'

function renderRegister(response: Partial<RegisterResponse> = {}) {
  const onRegister = vi.fn().mockResolvedValue({
    accountCreated: true,
    verificationEmailSent: false,
    message: 'Account created. You can sign in now.',
    emailVerificationRequired: false,
    ...response,
  })
  const onSwitchToLogin = vi.fn()
  const utils = render(
    <ToastProvider>
      <RegisterForm onRegister={onRegister} loading={false} onSwitchToLogin={onSwitchToLogin} />
    </ToastProvider>,
  )
  const form = utils.container.querySelector('form') as HTMLFormElement
  return { onRegister, onSwitchToLogin, form, container: utils.container }
}

function fillValid() {
  fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: ' new@example.com ' } })
  fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: GOOD_PASSWORD } })
  fireEvent.change(screen.getByLabelText(/^Confirm password/), { target: { value: GOOD_PASSWORD } })
  fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Ada' } })
  fireEvent.change(screen.getByLabelText(/^Surname/), { target: { value: 'Lovelace' } })
  fireEvent.click(screen.getByRole('checkbox', { name: /accept the terms of use/i }))
}

describe('RegisterForm', () => {
  afterEach(() => cleanup())

  it('shows the success state inline and hands the email to the login form', async () => {
    const { onRegister, onSwitchToLogin, form } = renderRegister()
    fillValid()
    fireEvent.submit(form)
    expect(await screen.findByText('Account created. You can sign in now.')).toBeTruthy()
    expect(onRegister).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }))
    expect(onSwitchToLogin).toHaveBeenCalledWith('new@example.com')
  })

  it('asks to check the inbox when the server requires a confirmed email', async () => {
    const { form } = renderRegister({ emailVerificationRequired: true, verificationEmailSent: true })
    fillValid()
    fireEvent.submit(form)
    expect(await screen.findByText(/check your email to confirm your account/i)).toBeTruthy()
  })

  it('treats an older backend without the flag as requiring confirmation', async () => {
    const { form } = renderRegister({ emailVerificationRequired: undefined, verificationEmailSent: true })
    fillValid()
    fireEvent.submit(form)
    expect(await screen.findByText(/check your email to confirm your account/i)).toBeTruthy()
  })
})
