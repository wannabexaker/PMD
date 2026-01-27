import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { confirmEmail } from '../api/auth'
import type { ConfirmEmailStatus } from '../types'

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'confirmed' | 'already' | 'invalid'>('loading')
  const navigate = useNavigate()

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('invalid')
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
  }, [searchParams])

  const content = useMemo(() => {
    if (status === 'confirmed') {
      return {
        message: 'Your account has been successfully activated.',
        tone: 'success' as const,
      }
    }
    if (status === 'already') {
      return {
        message: 'Your account is already activated.',
        tone: 'info' as const,
      }
    }
    if (status === 'invalid') {
      return {
        message: 'This confirmation link is invalid or has expired.',
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
      {content ? (
        <p className={content.tone === 'error' ? 'error' : 'muted'}>{content.message}</p>
      ) : null}
      {status !== 'loading' ? (
        <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>
          Go to login
        </button>
      ) : null}
    </section>
  )
}
