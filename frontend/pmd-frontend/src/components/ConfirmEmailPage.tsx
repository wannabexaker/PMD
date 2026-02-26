import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmEmail } from '../api/auth'
import type { ConfirmEmailStatus } from '../types'
import { useAuth } from '../auth/authUtils'
import { getAuthNotification } from '../auth/authNotificationMatrix'

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'already' | 'invalid'>(() =>
    token ? 'loading' : 'invalid'
  )
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    if (!token) {
      return
    }
    confirmEmail(token)
      .then((response) => {
        const result = response?.status as ConfirmEmailStatus | undefined
        if (result === 'CONFIRMED') {
          setStatus('confirmed')
        } else if (result === 'ALREADY_CONFIRMED') {
          setStatus('already')
        } else {
          setStatus('invalid')
        }
      })
      .catch(() => {
        setStatus('invalid')
      })
  }, [token])

  const content = useMemo(() => {
    if (status === 'confirmed') {
      return {
        message: getAuthNotification('confirm_email_success').message,
        tone: 'success' as const,
      }
    }
    if (status === 'already') {
      return {
        message: getAuthNotification('confirm_email_already').message,
        tone: 'info' as const,
      }
    }
    if (status === 'invalid') {
      return {
        message: getAuthNotification('confirm_email_invalid').message,
        tone: 'error' as const,
      }
    }
    return null
  }, [status])

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Confirm Email</h2>
      </div>
      {status === 'loading' ? <p>Confirming your email...</p> : null}
      {content ? <p className={content.tone === 'error' ? 'error' : 'muted'}>{content.message}</p> : null}
      {status !== 'loading' ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(user ? '/dashboard' : '/login')}
        >
          {user ? 'Back to app' : 'Go to login'}
        </button>
      ) : null}
    </section>
  )
}
