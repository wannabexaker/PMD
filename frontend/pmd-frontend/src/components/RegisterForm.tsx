import { useEffect, useRef, useState } from 'react'
import { Logo } from './Logo'
import type { RegisterPayload, RegisterResponse } from '../types'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { getAuthNotification } from '../auth/authNotificationMatrix'

type RegisterFormProps = {
  onRegister: (payload: RegisterPayload) => Promise<RegisterResponse>
  loading: boolean
  onSwitchToLogin: () => void
}

const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'At least 10 characters', test: (value: string) => value.length >= 10 },
  { key: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { key: 'digit', label: 'One number', test: (value: string) => /\d/.test(value) },
  { key: 'symbol', label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
]

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

export function RegisterForm({ onRegister, loading, onSwitchToLogin }: RegisterFormProps) {
  const { showToast } = useToast()
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
  const [showSuccess, setShowSuccess] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)
  const [showPasswordHints, setShowPasswordHints] = useState(false)
  const passwordHintsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!showSuccess) {
      return
    }
    const timeout = window.setTimeout(() => {
      onSwitchToLogin()
    }, 2500)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [showSuccess, onSwitchToLogin])

  useEffect(() => {
    if (!showPasswordHints) {
      return
    }
    const onMouseDown = (event: MouseEvent) => {
      if (!passwordHintsRef.current) {
        return
      }
      if (!passwordHintsRef.current.contains(event.target as Node)) {
        setShowPasswordHints(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
    }
  }, [showPasswordHints])

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setFieldErrors({})

    const errors: Record<string, string> = {}
    if (!form.email.trim()) {
      errors.email = 'Email is required.'
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
    if (Object.keys(errors).length > 0) {
      setConfirmTouched(true)
      setFieldErrors(errors)
      showToast({ type: 'error', message: getAuthNotification('register_form_invalid').message })
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
      })
      if (!result.accountCreated) {
        throw new Error(result.message || 'Registration failed')
      }
      if (result.verificationEmailSent) {
        setShowSuccess(true)
        showToast({
          type: 'success',
          message: result.message || getAuthNotification('register_created_email_sent').message,
        })
      } else {
        showToast({
          type: 'info',
          message: result.message || getAuthNotification('register_created_email_failed').message,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      showToast({ type: 'error', message })
    }
  }

  const trimmedPassword = form.password.trim()
  const trimmedConfirm = form.confirmPassword.trim()
  const passwordMismatch =
    confirmTouched &&
    trimmedConfirm.length > 0 &&
    trimmedPassword.length > 0 &&
    trimmedPassword !== trimmedConfirm
  const confirmMatches = trimmedConfirm.length > 0 && trimmedPassword.length > 0 && !passwordMismatch
  const mismatchId = 'confirm-password-mismatch'

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
        <button type="button" className="btn btn-secondary" onClick={onSwitchToLogin}>
          Back to login
        </button>
      </div>
      {showSuccess ? (
        <div className="auth-success">
          <div className="banner info">
            <strong>Check your email to confirm your account.</strong>
            <div className="muted">If you don't see it, check your spam folder.</div>
          </div>
          <button type="button" className="btn btn-primary full-width" onClick={onSwitchToLogin}>
            Back to login
          </button>
        </div>
      ) : (
        <form className="form auth-form" onSubmit={handleSubmit}>
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
                required
              />
              <span className="field-error">{fieldErrors.email ?? ''}</span>
            </div>
            <div className="form-field password-field-with-hints" ref={passwordHintsRef}>
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
                  onFocus={() => setShowPasswordHints(true)}
                  onClick={() => setShowPasswordHints(true)}
                  minLength={10}
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
                  onChange={(event) => {
                    handleChange(event)
                    if (!confirmTouched) {
                      setConfirmTouched(true)
                    }
                  }}
                  minLength={10}
                  aria-invalid={passwordMismatch}
                  aria-describedby={passwordMismatch ? mismatchId : undefined}
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
                {fieldErrors.confirmPassword ?? ''}
              </span>
            </div>
            <div className="form-field">
              <label htmlFor="firstName">
                Name <span className="required">*</span>
              </label>
              <input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required />
              <span className="field-error">{fieldErrors.firstName ?? ''}</span>
            </div>
            <div className="form-field">
              <label htmlFor="lastName">
                Surname <span className="required">*</span>
              </label>
              <input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required />
              <span className="field-error">{fieldErrors.lastName ?? ''}</span>
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={256} />
              <span className="muted">{(form.bio ?? '').length}/256</span>
              <span className="field-error">{fieldErrors.bio ?? ''}</span>
            </div>
          </div>
          <div className="form-field form-span-2">
            <button type="submit" className="btn btn-primary full-width" disabled={loading}>
              {loading ? 'Creating...' : 'Create account'}
            </button>
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
