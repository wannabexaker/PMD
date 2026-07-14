import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID, isGoogleEnabled } from '../../lib/authProviders'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void
        }
      }
    }
  }
}

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
// Google renders its button at up to 400px; we stretch that invisible button
// with a CSS transform to cover whatever width our own button occupies.
const GIS_BASE_WIDTH = 400

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve()
      return
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Google script failed to load')))
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google script failed to load'))
    document.head.appendChild(script)
  })
}

function GoogleGlyph() {
  return (
    <svg className="google-auth-glyph" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48Z" />
      <path fill="#4285F4" d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#FBBC05" d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18Z" />
    </svg>
  )
}

/**
 * A custom, site-styled "Sign in with Google" button. The official Google
 * Identity Services button is rendered on top but made fully transparent and
 * stretched to cover our button, so the real (secure) ID-token flow fires on
 * click while the user only ever sees our own styling. Renders nothing when no
 * Google client id is configured.
 */
export function GoogleSignInButton({
  onCredential,
  label = 'Continue with Google',
}: {
  onCredential: (credential: string) => void
  label?: string
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const gisRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const onCredentialRef = useRef(onCredential)
  const [scaleX, setScaleX] = useState(1)

  useEffect(() => {
    onCredentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    if (!isGoogleEnabled) {
      return
    }
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !gisRef.current || !window.google?.accounts?.id || initializedRef.current) {
          return
        }
        initializedRef.current = true
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: { credential?: string }) => {
            if (response?.credential) {
              onCredentialRef.current(response.credential)
            }
          },
        })
        window.google.accounts.id.renderButton(gisRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'center',
          width: GIS_BASE_WIDTH,
        })
      })
      .catch(() => {
        // Google unavailable: our button stays visible but inert.
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Keep the invisible Google button stretched to exactly cover our button.
  useEffect(() => {
    if (!isGoogleEnabled) {
      return
    }
    const el = wrapRef.current
    if (!el || typeof ResizeObserver === 'undefined') {
      return
    }
    const update = () => {
      const width = el.clientWidth
      if (width > 0) {
        setScaleX(width / GIS_BASE_WIDTH)
      }
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  if (!isGoogleEnabled) {
    return null
  }

  return (
    <div className="google-auth" ref={wrapRef}>
      <button type="button" className="btn btn-google" tabIndex={-1} aria-hidden="true">
        <GoogleGlyph />
        <span>{label}</span>
      </button>
      <div className="google-auth-gis">
        <div className="google-auth-gis-inner" style={{ transform: `scaleX(${scaleX})` }}>
          <div ref={gisRef} />
        </div>
      </div>
    </div>
  )
}
