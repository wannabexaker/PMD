import { useState } from 'react'
import { Logo } from './Logo'
import type { RegisterPayload, RegisterResponse } from '../types'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { getAuthNotification } from '../auth/authNotificationMatrix'
import { GoogleSignInButton } from './auth/GoogleSignInButton'
import { TurnstileWidget } from './auth/TurnstileWidget'
import { BackendOfflineNotice } from './auth/BackendOfflineNotice'
import { useBackendStatus } from './auth/useBackendStatus'
import { isGoogleEnabled, isTurnstileEnabled } from '../lib/authProviders'

type RegisterFormProps = {
  onRegister: (payload: RegisterPayload) => Promise<RegisterResponse>
  onGoogleLogin?: (credential: string, remember: boolean, acceptedTerms?: boolean) => Promise<void>
  loading: boolean
  // Called with the new account's email after a successful sign-up, to prefill the login form.
  onSwitchToLogin: (email?: string) => void
}

type RegisterOutcome = {
  email: string
  // 'ready': the account can sign in now. 'confirm': check the inbox first.
  // 'email-failed': verification is required but the email did not go out.
  kind: 'ready' | 'confirm' | 'email-failed'
  message: string
}

const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 10 characters', test: (value: string) => value.length >= 10 },
  { key: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', label: 'One number', test: (value: string) => /\d/.test(value) },
  { key: 'symbol', label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

// A light shape check: the form uses noValidate, so the browser no longer checks type="email".
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COMMON_PASSWORDS = new Set([
  '123456',
  '12345678',
  '123123',
  'password',
  'password1',
  'qwerty',
  'admin',
  'admin123',
  'letmein',
  'welcome',
  'iloveyou',
  '111111',
  '000000',
])

export function RegisterForm({ onRegister, onGoogleLogin, loading, onSwitchToLogin }: RegisterFormProps) {
  const { showToast } = useToast()
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileNonce, setTurnstileNonce] = useState(0)
  const [passwordTouched, setPasswordTouched] = useState(false)
  // Acceptance of the terms — deliberately not GDPR consent: the account runs on the
  // contract basis, so ticking this must never become the thing that legitimises processing.
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    bio: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Stays on screen until the user moves on: a timed redirect cut the message short.
  const [outcome, setOutcome] = useState<RegisterOutcome | null>(null)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [showPasswordHints, setShowPasswordHints] = useState(false)

  // Keep the bot-check hidden until the user actually engages with the password.
  const showTurnstile = isTurnstileEnabled && (passwordTouched || form.password.length > 0)

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
  }

  // The requirements popover overlaps the fields below it, so it closes as soon as focus
  // leaves the password field (Tab to the next field, or a click anywhere else).
  const handlePasswordFieldBlur: React.FocusEventHandler<HTMLDivElement> = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setShowPasswordHints(false)
    }
  }

  const invalidProps = (name: string) =>
    fieldErrors[name]
      ? { 'aria-invalid': true as const, 'aria-describedby': `${name}-error` }
      : {}

  // A demo whose backend is switched off should say so, not let a sign-up fail with a 502.
  const { status: backendStatus, recheck: recheckBackend } = useBackendStatus()
  const backendOffline = backendStatus === 'offline'

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    if (backendOffline) {
      return
    }
    setFieldErrors({})
    setPasswordTouched(true)

    const errors: Record<string, string> = {}
    if (!form.email.trim()) {
      errors.email = 'Email is required.'
    } else if (!EMAIL_PATTERN.test(form.email.trim())) {
      errors.email = 'Enter a valid email address.'
    }
    if (!form.password.trim()) {
      errors.password = 'Password is required.'
    } else {
      const failed = PASSWORD_REQUIREMENTS.find((requirement) => !requirement.test(form.password.trim()))
      if (failed) {
        errors.password = `Password requirement: ${failed.label}.`
      } else if (COMMON_PASSWORDS.has(form.password.trim().toLowerCase())) {
        errors.password = 'Password is too common.'
      }
    }
    if (!form.confirmPassword.trim()) {
      errors.confirmPassword = 'Please confirm your password.'
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.'
    }
    if (!form.firstName.trim()) {
      errors.firstName = 'Name is required.'
    }
    if (!form.lastName.trim()) {
      errors.lastName = 'Surname is required.'
    }
    if ((form.bio ?? '').length > 256) {
      errors.bio = 'Bio must be 256 characters or less.'
    }
    if (!acceptedTerms) {
      errors.acceptedTerms = 'Please accept the Terms of Use and Privacy Policy to continue.'
    }
    if (Object.keys(errors).length > 0) {
      setConfirmTouched(true)
      setFieldErrors(errors)
      showToast({ type: 'error', message: getAuthNotification('register_form_invalid').message })
      return
    }
    if (isTurnstileEnabled && !turnstileToken) {
      showToast({ type: 'error', message: 'Please complete the verification below.' })
      return
    }

    try {
      const result = await onRegister({
        email: form.email.trim(),
        password: form.password.trim(),
        confirmPassword: form.confirmPassword.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        bio: form.bio?.trim() || '',
        turnstileToken,
        acceptedTerms,
      })
      if (!result.accountCreated) {
        throw new Error(result.message || 'Registration failed')
      }
      const email = form.email.trim()
      if (result.emailVerificationRequired === false) {
        setOutcome({ email, kind: 'ready', message: 'Account created. You can sign in now.' })
      } else if (result.verificationEmailSent) {
        setOutcome({
          email,
          kind: 'confirm',
          message: result.message || getAuthNotification('register_created_email_sent').message,
        })
      } else {
        setOutcome({
          email,
          kind: 'email-failed',
          message: result.message || getAuthNotification('register_created_email_failed').message,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      showToast({ type: 'error', message })
      // The failed submit consumed the single-use Turnstile token; re-challenge for the retry.
      if (isTurnstileEnabled) {
        setTurnstileToken('')
        setTurnstileNonce((nonce) => nonce + 1)
      }
    }
  }

  const trimmedPassword = form.password.trim()
  const trimmedConfirm = form.confirmPassword.trim()
  const confirmMatches = trimmedConfirm.length > 0 && trimmedPassword.length > 0 && trimmedPassword === trimmedConfirm
  // Say it as soon as it is a real mismatch: once the confirmation is as long as the password,
  // or the user has left the field. Not on every keystroke of a half-typed confirmation.
  const passwordMismatch =
    trimmedConfirm.length > 0 &&
    trimmedPassword.length > 0 &&
    !confirmMatches &&
    (confirmTouched || trimmedConfirm.length >= trimmedPassword.length)
  const confirmError = fieldErrors.confirmPassword || (passwordMismatch ? 'Passwords do not match.' : '')
  const mismatchId = 'confirmPassword-error'

  return (
    <section className="panel auth-card">
      <div className="panel-header">
        <div className="panel-title auth-panel-title">
          <div className="auth-brand-row">
            <span className="panel-logo">
              <Logo size={28} showText={false} />
            </span>
            <p className="muted auth-brand-subtitle">Project Management Dashboard</p>
          </div>
          <h2>Register</h2>
        </div>
        <button type="button" className="btn btn-secondary" onClick={() => onSwitchToLogin(outcome?.email)}>
          Back to login
        </button>
      </div>
      <BackendOfflineNotice status={backendStatus} onRecheck={recheckBackend} />
      {outcome ? (
        <div className="auth-success" role="status">
          <div className="banner info">
            {outcome.kind === 'ready' ? (
              <>
                <strong>{outcome.message}</strong>
                <div className="muted">Sign in with {outcome.email} and the password you just chose.</div>
              </>
            ) : outcome.kind === 'confirm' ? (
              <>
                <strong>Check your email to confirm your account.</strong>
                <div className="muted">
                  We sent a link to {outcome.email}. If you don't see it, check your spam folder.
                </div>
              </>
            ) : (
              <strong>{outcome.message}</strong>
            )}
          </div>
          <button type="button" className="btn btn-primary full-width" onClick={() => onSwitchToLogin(outcome.email)}>
            {outcome.kind === 'ready' ? 'Sign in' : 'Back to login'}
          </button>
        </div>
      ) : (
        <form className="form auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-grid two-col">
            <div className="form-field form-span-2">
              <label htmlFor="email">
                Email <span className="required">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
                {...invalidProps('email')}
              />
              <span id="email-error" className="field-error">{fieldErrors.email ?? ''}</span>
            </div>
            <div className="form-field password-field-with-hints" onBlur={handlePasswordFieldBlur}>
              <label htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => {
                    setShowPasswordHints(true)
                    setPasswordTouched(true)
                  }}
                  onClick={() => setShowPasswordHints(true)}
                  autoComplete="new-password"
                  required
                  {...invalidProps('password')}
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <span id="password-error" className="field-error">{fieldErrors.password ?? ''}</span>
              {showPasswordHints ? (
                <div className="password-requirements-popover" aria-live="polite" role="dialog" aria-label="Password requirements">
                  <div className="password-requirements-header">Password requirements</div>
                  <div className="password-requirements-list">
                    {PASSWORD_REQUIREMENTS.map((requirement) => {
                      const ok = requirement.test(form.password)
                      return (
                        <span key={requirement.key} className={ok ? 'password-rule ok' : 'password-rule'}>
                          <strong className="password-rule-mark" aria-hidden="true">{ok ? '✓' : '✕'}</strong>
                          {requirement.label}
                        </span>
                      )
                    })}
                    <span className={confirmMatches ? 'password-rule ok' : 'password-rule'}>
                      <strong className="password-rule-mark" aria-hidden="true">{confirmMatches ? '✓' : '✕'}</strong>
                      Confirm password matches
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="form-field confirm-password-field">
              <label htmlFor="confirmPassword">
                Confirm password <span className="required">*</span>
              </label>
              <div className="input-with-icon confirm-password-input">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  onBlur={() => setConfirmTouched(true)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(confirmError)}
                  aria-describedby={confirmError ? mismatchId : undefined}
                  required
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <span id={mismatchId} className="field-error" aria-live="polite">
                {confirmError}
              </span>
            </div>
            <div className="form-field">
              <label htmlFor="firstName">
                Name <span className="required">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                autoComplete="given-name"
                required
                {...invalidProps('firstName')}
              />
              <span id="firstName-error" className="field-error">{fieldErrors.firstName ?? ''}</span>
            </div>
            <div className="form-field">
              <label htmlFor="lastName">
                Surname <span className="required">*</span>
              </label>
              <input
                id="lastName"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                autoComplete="family-name"
                required
                {...invalidProps('lastName')}
              />
              <span id="lastName-error" className="field-error">{fieldErrors.lastName ?? ''}</span>
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={3}
                maxLength={256}
                aria-describedby="bio-count"
              />
              <div className="auth-field-foot">
                <span id="bio-error" className="field-error">{fieldErrors.bio ?? ''}</span>
                <span id="bio-count" className="muted auth-field-count">{(form.bio ?? '').length}/256</span>
              </div>
            </div>
          </div>
          <div className="form-field">
            {/* Opens in a new tab on purpose: reading the terms must not discard a half-filled form. */}
            <label className="auth-consent">
              <input
                id="acceptedTerms"
                name="acceptedTerms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked)
                  setFieldErrors((prev) => (prev.acceptedTerms ? { ...prev, acceptedTerms: '' } : prev))
                }}
                aria-label="I accept the Terms of Use and Privacy Policy"
                aria-describedby="acceptedTerms-text acceptedTerms-error"
                aria-invalid={fieldErrors.acceptedTerms ? true : undefined}
                required
              />
              <span id="acceptedTerms-text">
                I have read and accept the{' '}
                <a href="/terms" target="_blank" rel="noreferrer">
                  Terms of Use
                </a>{' '}
                and the{' '}
                <a href="/privacy" target="_blank" rel="noreferrer">
                  Privacy Policy
                </a>
                . I understand that PMD is a free service provided &ldquo;as is&rdquo;, with no
                warranties, that I use it at my own risk, and that I am responsible for the
                content I add and how I use it.
              </span>
            </label>
            <span id="acceptedTerms-error" className="field-error auth-consent-error">
              {fieldErrors.acceptedTerms ?? ''}
            </span>
            {showTurnstile ? (
              <div className="auth-turnstile auth-reveal">
                <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileNonce} />
              </div>
            ) : null}
            <button type="submit" className="btn btn-primary full-width" disabled={loading || backendOffline}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
            {isGoogleEnabled && onGoogleLogin && !backendOffline ? (
              <>
                <div className="auth-divider"><span>or</span></div>
                <div className="auth-google">
                  {/* Signing up with Google must clear the same bar as the form, or the
                      checkbox is decoration. Not rendering the button also keeps Google's
                      script — and the contact with it — out of the page until they agree. */}
                  {acceptedTerms ? (
                    <GoogleSignInButton
                      label="Sign up with Google"
                      onCredential={(credential) => onGoogleLogin(credential, true, true)}
                    />
                  ) : (
                    <p className="muted auth-google-gate">
                      Accept the Terms of Use and Privacy Policy above to sign up with Google.
                    </p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </form>
      )}
    </section>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M2.5 12s3.8-6 9.5-6 9.5 6 9.5 6-3.8 6-9.5 6-9.5-6-9.5-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M4.2 6.2 19.8 21.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9.5 9.7A3.4 3.4 0 0 0 12 15.4c1.9 0 3.4-1.5 3.4-3.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 6.6C4.4 8.1 3 10 2.5 12c0 0 3.8 6 9.5 6 1.5 0 2.9-.3 4.1-.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10.7 5.6C11.1 5.5 11.6 5.5 12 5.5c5.7 0 9.5 6 9.5 6-.6 1-1.4 2.1-2.5 3.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  )
}
