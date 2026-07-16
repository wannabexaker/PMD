import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import type { LoginPayload } from '../types'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { getAuthNotification } from '../auth/authNotificationMatrix'
import { GoogleSignInButton } from './auth/GoogleSignInButton'
import { TurnstileWidget } from './auth/TurnstileWidget'
import { isGoogleEnabled, isTurnstileEnabled } from '../lib/authProviders'

type LoginFormProps = {
  onLogin: (payload: LoginPayload) => Promise<void>
  onGoogleLogin?: (credential: string, remember: boolean) => Promise<void>
  error: string | null
  loading: boolean
  onSwitchToRegister: () => void
}

const EMAIL_KEY = 'pmd_login_email'

function getSavedEmail() {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    return ''
  }
}

export function LoginForm({ onLogin, onGoogleLogin, error, loading, onSwitchToRegister }: LoginFormProps) {
  const [form, setForm] = useState<LoginPayload>(() => ({ username: getSavedEmail(), password: '', remember: false }))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileNonce, setTurnstileNonce] = useState(0)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const { showToast } = useToast()

  // Keep the bot-check out of the way until the user actually starts logging in.
  const showTurnstile = isTurnstileEnabled && (passwordTouched || form.password.length > 0)

  useEffect(() => {
    if (!error) {
      return
    }
    showToast({ type: 'error', message: error })
  }, [error, showToast])

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: '' }))
    if (name === 'username') {
      localStorage.setItem(EMAIL_KEY, value)
    }
  }

  const handleCheckbox: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const { name, checked } = event.target
    setForm((prev) => ({ ...prev, [name]: checked }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setFieldErrors({})
    setPasswordTouched(true)

    const errors: Record<string, string> = {}
    if (!form.username.trim()) {
      errors.username = 'Email is required.'
    }
    if (!form.password) {
      errors.password = 'Password is required.'
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      showToast({ type: 'error', message: getAuthNotification('login_form_invalid').message })
      return
    }
    if (isTurnstileEnabled && !turnstileToken) {
      showToast({ type: 'error', message: 'Please complete the verification below.' })
      return
    }

    try {
      await onLogin({ username: form.username.trim(), password: form.password, remember: form.remember, turnstileToken })
    } catch {
      // Login failed; the single-use Turnstile token is now spent — re-challenge for the retry.
      if (isTurnstileEnabled) {
        setTurnstileToken('')
        setTurnstileNonce((nonce) => nonce + 1)
      }
    }
  }

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
          <h2>Login</h2>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onSwitchToRegister}>
          Register
        </button>
      </div>
      <p className="auth-beta-note">
        PMD is in <strong>beta</strong>. Expect rough edges — and there are <strong>no backups</strong>:
        don&apos;t keep anything here you can&apos;t afford to lose.
      </p>
      <form className="form auth-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="username">
              Email <span className="required">*</span>
            </label>
            <input
              id="username"
              name="username"
              type="email"
              value={form.username}
              onChange={handleChange}
              required
            />
            <span className="field-error">{fieldErrors.username ?? ''}</span>
          </div>
          <div className="form-field">
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
                onFocus={() => setPasswordTouched(true)}
                required
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
            <span className="field-error">{fieldErrors.password ?? ''}</span>
          </div>
        </div>
        <div className="form-meta">
          <label className="checkbox remember-checkbox">
            <input
              type="checkbox"
              name="remember"
              checked={Boolean(form.remember)}
              onChange={handleCheckbox}
            />
            Stay signed in
          </label>
        </div>
        {showTurnstile ? (
          <div className="auth-turnstile auth-reveal">
            <TurnstileWidget onToken={setTurnstileToken} resetSignal={turnstileNonce} />
          </div>
        ) : null}
        <button type="submit" className="btn btn-primary full-width" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
        {isGoogleEnabled && onGoogleLogin ? (
          <>
            <div className="auth-divider"><span>or</span></div>
            <div className="auth-google">
              <GoogleSignInButton
                label="Sign in with Google"
                onCredential={(credential) => onGoogleLogin(credential, Boolean(form.remember))}
              />
            </div>
          </>
        ) : null}
      </form>
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

