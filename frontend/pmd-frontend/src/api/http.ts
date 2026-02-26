const ENV_API_BASE_URL = (import.meta as ImportMeta).env?.VITE_API_BASE_URL as string | undefined
const MODE = (import.meta as ImportMeta).env?.MODE as string | undefined
// Keep API calls same-origin by default.
// Dev uses Vite proxy, Docker/Prod uses Nginx reverse proxy.
const DEFAULT_API_BASE_URL = ''
export const API_BASE_URL =
  ENV_API_BASE_URL && ENV_API_BASE_URL.trim().length > 0 ? ENV_API_BASE_URL : DEFAULT_API_BASE_URL
const ONLINE_EVENT = 'pmd:online'
const OFFLINE_EVENT = 'pmd:offline'
let lastReachability: 'online' | 'offline' | null = null

if (typeof window !== 'undefined' && MODE === 'development') {
  // Keep a single low-noise startup hint in dev only.
  console.debug('[PMD] API base URL:', API_BASE_URL || '(same-origin)')
}
const TOKEN_KEY = 'pmd_token'
const TOKEN_EXP_KEY = 'pmd_token_exp'
let memoryToken: string | null = null
let memoryTokenExp = 0
let refreshHandler: (() => Promise<string | null>) | null = null

type JsonValue = unknown

export class ApiError extends Error {
  status: number
  data?: JsonValue | null
  requestId?: string | null

  constructor(message: string, status: number, data?: JsonValue | null, requestId?: string | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.requestId = requestId ?? null
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function safeParseJson(text: string): JsonValue | null {
  try {
    return JSON.parse(text) as JsonValue
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  if (!memoryToken) {
    return null
  }
  if (memoryTokenExp > 0 && Date.now() >= memoryTokenExp) {
    memoryToken = null
    memoryTokenExp = 0
    return null
  }
  return memoryToken
}

export function setAuthToken(token: string, remember: boolean) {
  void remember
  memoryToken = token
  memoryTokenExp = decodeJwtExpMs(token)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function clearAuthToken() {
  memoryToken = null
  memoryTokenExp = 0
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export function registerAuthRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler
}

function decodeJwtExpMs(token: string): number {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return 0
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return payload.exp ? payload.exp * 1000 : 0
  } catch {
    return 0
  }
}

async function doFetch(path: string, options: RequestInit | undefined, token: string | null): Promise<Response> {
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  const method = (options?.method ?? 'GET').toUpperCase()
  const csrfToken = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' ? readCookie('PMD_CSRF') : null
  const requestId = createRequestId()
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(csrfToken ? { 'X-PMD-CSRF': csrfToken } : {}),
      'X-Request-Id': requestId,
      ...(options?.headers ?? {}),
    },
  })
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const prefix = `${encodeURIComponent(name)}=`
  const parts = document.cookie.split(';')
  for (const rawPart of parts) {
    const part = rawPart.trim()
    if (part.startsWith(prefix)) {
      return decodeURIComponent(part.substring(prefix.length))
    }
  }
  return null
}

export async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken()
  let response: Response
  try {
    response = await doFetch(path, options, token)
  } catch {
    if (typeof window !== 'undefined' && lastReachability !== 'offline') {
      lastReachability = 'offline'
      window.dispatchEvent(new CustomEvent(OFFLINE_EVENT, { detail: { baseUrl: API_BASE_URL } }))
    }
    throw new ApiError(`Cannot reach server. Check backend is running at ${API_BASE_URL} and try again.`, 0, null, null)
  }

  if (typeof window !== 'undefined' && lastReachability !== 'online') {
    lastReachability = 'online'
    window.dispatchEvent(new CustomEvent(ONLINE_EVENT, { detail: { baseUrl: API_BASE_URL } }))
  }

  const isAuthEndpoint = path.startsWith('/api/auth/login') || path.startsWith('/api/auth/register') || path.startsWith('/api/auth/refresh') || path.startsWith('/api/auth/confirm')
  if (response.status === 401 && refreshHandler && !isAuthEndpoint) {
    try {
      const refreshedToken = await refreshHandler()
      if (refreshedToken) {
        response = await doFetch(path, options, refreshedToken)
      }
    } catch {
      clearAuthToken()
      window.dispatchEvent(new Event('pmd:unauthorized'))
    }
  }

  const text = await response.text()
  const data = text ? safeParseJson(text) : null
  const responseRequestId = response.headers.get('X-Request-Id')
  const payloadRequestId =
    typeof data === 'object' && data && 'requestId' in data && typeof (data as { requestId?: unknown }).requestId === 'string'
      ? ((data as { requestId?: string }).requestId ?? null)
      : null
  const requestId = payloadRequestId ?? responseRequestId

  if (response.status === 401) {
    clearAuthToken()
    if (!isAuthEndpoint) {
      window.dispatchEvent(new Event('pmd:unauthorized'))
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data
        ? 'message' in data
          ? String(data.message)
          : 'error' in data
            ? String((data as { error?: string }).error)
            : 'errors' in data && Array.isArray((data as { errors?: { defaultMessage?: string }[] }).errors)
              ? (data as { errors: { defaultMessage?: string }[] }).errors
                  .map((err) => err.defaultMessage)
                  .filter(Boolean)
                  .join(', ')
              : ''
        : ''
    throw new ApiError(message || text || 'Request failed', response.status, data, requestId)
  }

  return data as T
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
