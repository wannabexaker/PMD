import { useEffect, useRef, useState } from 'react'
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
// A blocker or firewall can swallow the request without an error event; give up after this.
const SCRIPT_TIMEOUT_MS = 15000

export const TURNSTILE_FAILED_MESSAGE =
  'Verification could not load. Check your connection or turn off content blockers for this site, then retry.'

function loadTurnstileScript(timeoutMs: number = SCRIPT_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (!script) {
      script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
    const element = script
    const fail = () => {
      clearTimeout(timer)
      // Drop the dead tag so a retry fetches the script again instead of waiting on it forever.
      element.remove()
      reject(new Error('Turnstile failed to load'))
    }
    const timer = setTimeout(fail, timeoutMs)
    element.addEventListener('load', () => {
      clearTimeout(timer)
      resolve()
    })
    element.addEventListener('error', fail)
  })
}

/**
 * Renders a Cloudflare Turnstile widget and reports its token via onToken
 * (empty string when the token expires or errors). Renders nothing when no
 * site key is configured. Turnstile tokens are single-use, so bump `resetSignal`
 * after a failed submit to force a fresh challenge for the next attempt.
 *
 * When the script cannot load or the challenge errors, it says so and offers a retry,
 * because without a token the form cannot be submitted at all.
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
  const [failed, setFailed] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)
  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

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
          callback: (token: string) => {
            setFailed(false)
            onTokenRef.current(token)
          },
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => {
            setFailed(true)
            onTokenRef.current('')
          },
        })
      })
      .catch(() => {
        // Leave the token empty; the server still enforces it when enabled.
        if (!cancelled) {
          setFailed(true)
        }
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
  }, [loadAttempt])

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

  const retry = () => {
    setFailed(false)
    onTokenRef.current('')
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        return
      } catch {
        // Fall through to a full reload of the widget.
      }
    }
    setLoadAttempt((attempt) => attempt + 1)
  }

  if (!isTurnstileEnabled) {
    return null
  }
  return (
    <div className="turnstile-wrap">
      <div className="turnstile-widget" ref={containerRef} />
      {failed ? (
        <div className="turnstile-failed" role="alert">
          <span className="field-error">{TURNSTILE_FAILED_MESSAGE}</span>
          <button type="button" className="btn btn-secondary" onClick={retry}>
            Retry verification
          </button>
        </div>
      ) : null}
    </div>
  )
}
