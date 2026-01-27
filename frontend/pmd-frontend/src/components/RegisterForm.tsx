import { useEffect, useState } from 'react'
import { Logo } from './Logo'
import type { RegisterPayload } from '../types'

type RegisterFormProps = {
  onRegister: (payload: RegisterPayload) => Promise<void>
  error: string | null
  loading: boolean
  onSwitchToLogin: () => void
}

export function RegisterForm({ onRegister, error, loading, onSwitchToLogin }: RegisterFormProps) {
  const [form, setForm] = useState<RegisterPayload>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    team: 'Web Developer Team',
    bio: '',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [confirmTouched, setConfirmTouched] = useState(false)

  useEffect(() => {
    if (!error && !formError) {
      return
    }
    const timer = window.setTimeout(() => {
      setFormError(null)
    }, 10000)
    return () => {
      window.clearTimeout(timer)
    }
  }, [error, formError])

  useEffect(() => {
    if (error) {
      setFormError(error)
    }
  }, [error])

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

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setFormError(null)

    if (!form.email.trim() || !form.password.trim()) {
      setFormError('Email and password are required.')
      return
    }

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setFormError('Name and surname are required.')
      return
    }

    if (form.password.trim().length < 6) {
      setFormError('Password must be at least 6 characters.')
      return
    }

    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match.')
      return
    }

    if ((form.bio ?? '').length > 256) {
      setFormError('Bio must be 256 characters or less.')
      return
    }

    try {
      await onRegister({
        email: form.email.trim(),
        password: form.password.trim(),
        confirmPassword: form.confirmPassword.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        team: form.team?.trim() || 'Web Developer Team',
        bio: form.bio?.trim() || '',
      })
      setShowSuccess(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      setFormError(message)
    }
  }

  const passwordMismatch =
    confirmTouched &&
    form.confirmPassword.length > 0 &&
    form.password.length > 0 &&
    form.password !== form.confirmPassword

  return (
    <section className="panel auth-card">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-logo">
            <Logo size={28} showText={false} />
          </span>
          <div>
            <h2>Register</h2>
            <p className="muted">Create your PMD account</p>
          </div>
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
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  minLength={6}
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
            </div>
            <div className="form-field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="input-with-icon">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(event) => {
                    handleChange(event)
                    if (!confirmTouched) {
                      setConfirmTouched(true)
                    }
                  }}
                  minLength={6}
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
              {passwordMismatch ? <span className="inline-error">Passwords do not match.</span> : null}
            </div>
            <div className="form-field">
              <label htmlFor="firstName">Name</label>
              <input id="firstName" name="firstName" value={form.firstName} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label htmlFor="lastName">Surname</label>
              <input id="lastName" name="lastName" value={form.lastName} onChange={handleChange} required />
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="team">Team</label>
              <select id="team" name="team" value={form.team} onChange={handleChange} required>
                <option value="Web Developer Team">Web Developer Team</option>
                <option value="DevOps">DevOps</option>
                <option value="Project Manager">Project Manager</option>
              </select>
            </div>
            <div className="form-field form-span-2">
              <label htmlFor="bio">Bio</label>
              <textarea id="bio" name="bio" value={form.bio} onChange={handleChange} rows={3} maxLength={256} />
              <span className="muted">{(form.bio ?? '').length}/256</span>
            </div>
          </div>
          {formError ? <p className="error">{formError}</p> : null}
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