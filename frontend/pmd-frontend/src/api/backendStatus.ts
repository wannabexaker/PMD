import { API_BASE_URL } from './http'

export type BackendStatus = 'checking' | 'online' | 'offline'

const PROBE_TIMEOUT_MS = 6000

/**
 * Asks the backend whether it is up.
 *
 * PMD is a demo and its backend is sometimes switched off on purpose. When it is, the public
 * frontend still loads, but every sign-in fails (Cloudflare answers 502). This probe lets the
 * auth screens say so up front instead of letting people type credentials into a dead form.
 *
 * Online only when the health endpoint answers 200 with `{"status":"UP"}`. Everything else counts
 * as offline: a network error, a timeout, a 5xx from the proxy or tunnel, a health check that
 * reports DOWN, or an HTML page where JSON was expected (a missing proxy rule falls through to
 * the SPA shell, which is also a backend PMD cannot use).
 */
export async function probeBackend(
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<'online' | 'offline'> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${API_BASE_URL}/actuator/health`, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
    })
    if (!response.ok) {
      return 'offline'
    }
    const body: unknown = await response.json()
    return body && typeof body === 'object' && (body as { status?: unknown }).status === 'UP'
      ? 'online'
      : 'offline'
  } catch {
    return 'offline'
  } finally {
    clearTimeout(timer)
  }
}

// One probe per page load, shared by every screen that asks — switching between the login and
// register forms must not fire a new request each time.
let cached: Promise<'online' | 'offline'> | null = null

export function getBackendStatus(): Promise<'online' | 'offline'> {
  if (!cached) {
    cached = probeBackend()
  }
  return cached
}

/** Drops the cached answer and probes again (the "Check again" button). */
export function recheckBackendStatus(): Promise<'online' | 'offline'> {
  cached = probeBackend()
  return cached
}
