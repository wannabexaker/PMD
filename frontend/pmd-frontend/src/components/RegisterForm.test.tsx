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
  fireEvent.click(screen.getByRole('checkbox', { name: 'I accept the Terms of Use and Privacy Policy' }))
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

  it('validates itself and shows inline errors instead of browser bubbles', () => {
    const { onRegister, form } = renderRegister()
    expect(form.noValidate).toBe(true)
    fireEvent.change(screen.getByLabelText(/^Email/), { target: { value: 'not-an-email' } })
    fireEvent.submit(form)
    expect(onRegister).not.toHaveBeenCalled()
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy()
    expect(screen.getByText('Name is required.')).toBeTruthy()
    expect(screen.getByText('Please accept the Terms of Use and Privacy Policy to continue.')).toBeTruthy()
    expect(screen.getByLabelText(/^Email/).getAttribute('aria-invalid')).toBe('true')
  })

  it('says the passwords do not match as soon as the confirmation is complete', () => {
    renderRegister()
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: GOOD_PASSWORD } })
    const confirm = screen.getByLabelText(/^Confirm password/)
    // Half-typed: no complaint yet.
    fireEvent.change(confirm, { target: { value: 'Str0' } })
    expect(screen.queryByText('Passwords do not match.')).toBeNull()
    // As long as the password but different: say it, before any submit.
    fireEvent.change(confirm, { target: { value: 'Str0ng!Passw0rX' } })
    expect(screen.getByText('Passwords do not match.')).toBeTruthy()
    fireEvent.change(confirm, { target: { value: GOOD_PASSWORD } })
    expect(screen.queryByText('Passwords do not match.')).toBeNull()
  })

  it('closes the password requirements when focus moves on to the next field', () => {
    renderRegister()
    const password = screen.getByLabelText(/^Password/)
    fireEvent.focus(password)
    expect(screen.getByRole('dialog', { name: /password requirements/i })).toBeTruthy()
    fireEvent.blur(password, { relatedTarget: screen.getByLabelText(/^Name/) })
    expect(screen.queryByRole('dialog', { name: /password requirements/i })).toBeNull()
  })

  it('treats an older backend without the flag as requiring confirmation', async () => {
    const { form } = renderRegister({ emailVerificationRequired: undefined, verificationEmailSent: true })
    fillValid()
    fireEvent.submit(form)
    expect(await screen.findByText(/check your email to confirm your account/i)).toBeTruthy()
  })
})
