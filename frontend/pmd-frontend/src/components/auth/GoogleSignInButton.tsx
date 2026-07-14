import { useEffect, useRef } from 'react'
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

/**
 * Renders the official Google Identity Services button and reports the returned
 * ID token via onCredential. Renders nothing when no Google client id is set.
 */
export function GoogleSignInButton({ onCredential }: { onCredential: (credential: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const initializedRef = useRef(false)
  const onCredentialRef = useRef(onCredential)
  onCredentialRef.current = onCredential

  useEffect(() => {
    if (!isGoogleEnabled) {
      return
    }
    let cancelled = false
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id || initializedRef.current) {
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
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        })
      })
      .catch(() => {
        // Google unavailable: the button simply does not appear.
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isGoogleEnabled) {
    return null
  }
  return <div className="google-signin" ref={containerRef} />
}
