import { API_BASE_URL } from './http'

export type BackendStatus = 'checking' | 'online' | 'offline'

const PROBE_TIMEOUT_MS = 6000

// The states Spring Boot's health endpoint reports. Any of them means the API itself answered.
const SPRING_HEALTH_STATES = new Set(['UP', 'DOWN', 'OUT_OF_SERVICE', 'UNKNOWN'])

/**
 * Asks whether the API can be reached at all.
 *
 * PMD is a demo and its backend is sometimes switched off on purpose. When it is, the public
 * frontend still loads, but every sign-in fails (Cloudflare answers 502 or 530 with an HTML
 * page). This probe lets the auth screens say so up front instead of letting people type
 * credentials into a dead form.
 *
 * Offline means the API did not answer: a network error, a timeout, or a response that is not
 * Spring's health JSON (the HTML error page of the proxy or tunnel, or the SPA shell when a
 * proxy rule is missing). A health body that says DOWN or OUT_OF_SERVICE came from the API
 * itself: one indicator is unhealthy (a mail server, say), but sign-in may well work, so that
 * counts as online. Spring sends it with a 503, so the status code alone cannot decide.
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
    const body: unknown = await response.json()
    const state = body && typeof body === 'object' ? (body as { status?: unknown }).status : undefined
    return typeof state === 'string' && SPRING_HEALTH_STATES.has(state) ? 'online' : 'offline'
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
