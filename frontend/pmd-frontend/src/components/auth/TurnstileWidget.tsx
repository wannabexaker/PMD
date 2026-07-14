import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY, isTurnstileEnabled } from '../../lib/authProviders'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string
      remove: (id: string) => void
      reset: (id?: string) => void
    }
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Turnstile failed to load')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.appendChild(script)
  })
}

/**
 * Renders a Cloudflare Turnstile widget and reports its token via onToken
 * (empty string when the token expires or errors). Renders nothing when no
 * site key is configured. Turnstile tokens are single-use, so bump `resetSignal`
 * after a failed submit to force a fresh challenge for the next attempt.
 */
export function TurnstileWidget({
  onToken,
  resetSignal = 0,
}: {
  onToken: (token: string) => void
  resetSignal?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!isTurnstileEnabled) {
      return
    }
    let cancelled = false
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) {
          return
        }
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        })
      })
      .catch(() => {
        // Leave the token empty; the server still enforces it when enabled.
      })
    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {
          // Widget already gone.
        }
        widgetIdRef.current = null
      }
    }
  }, [])

  // A consumed (single-use) token must be discarded and re-challenged before a retry.
  const skipFirstResetRef = useRef(true)
  useEffect(() => {
    if (skipFirstResetRef.current) {
      skipFirstResetRef.current = false
      return
    }
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        onTokenRef.current('')
      } catch {
        // Widget not ready; nothing to reset.
      }
    }
  }, [resetSignal])

  if (!isTurnstileEnabled) {
    return null
  }
  return <div className="turnstile-widget" ref={containerRef} />
}
