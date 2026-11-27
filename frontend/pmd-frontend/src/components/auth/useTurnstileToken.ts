import { useCallback, useRef, useState } from 'react'

/**
 * Holds the Turnstile token and lets a submit wait for it. The widget starts its check as soon
 * as the form mounts; if the user submits before the token has arrived, the submit waits for it
 * (up to `timeoutMs`) instead of failing with "complete the verification".
 */
export function useTurnstileToken() {
  const [token, setTokenState] = useState('')
  const tokenRef = useRef('')
  const waiters = useRef<Array<(value: string) => void>>([])

  const setToken = useCallback((value: string) => {
    tokenRef.current = value
    setTokenState(value)
    if (value) {
      const pending = waiters.current
      waiters.current = []
      pending.forEach((resolve) => resolve(value))
    }
  }, [])

  /** Resolves with the token, or with '' if none arrives within the timeout. */
  const waitForToken = useCallback((timeoutMs = 15000): Promise<string> => {
    if (tokenRef.current) return Promise.resolve(tokenRef.current)
    return new Promise((resolve) => {
      const timer = window.setTimeout(() => {
        waiters.current = waiters.current.filter((fn) => fn !== done)
        resolve('')
      }, timeoutMs)
      const done = (value: string) => {
        window.clearTimeout(timer)
        resolve(value)
      }
      waiters.current.push(done)
    })
  }, [])

  return { token, setToken, waitForToken }
}
