export const API_BASE_URL = 'http://localhost:8080'
const TOKEN_KEY = 'pmd_token'
const TOKEN_EXP_KEY = 'pmd_token_exp'

type JsonValue = unknown

export class ApiError extends Error {
  status: number
  data?: JsonValue | null

  constructor(message: string, status: number, data?: JsonValue | null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
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
  const now = Date.now()
  const localToken = localStorage.getItem(TOKEN_KEY)
  const localExp = localStorage.getItem(TOKEN_EXP_KEY)
  if (localToken && (!localExp || Number(localExp) > now)) {
    return localToken
  }
  if (localToken && localExp && Number(localExp) <= now) {
    clearAuthToken()
    return null
  }

  return sessionStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000))
  } else {
    sessionStorage.setItem(TOKEN_KEY, token)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_EXP_KEY)
  }
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

export async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken()
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
    })
  } catch {
    throw new ApiError(
      'Cannot reach server. Check backend is running at http://localhost:8080 and try again.',
      0
    )
  }

  const text = await response.text()
  const data = text ? safeParseJson(text) : null

  if (response.status === 401) {
    clearAuthToken()
    window.dispatchEvent(new Event('pmd:unauthorized'))
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
    throw new ApiError(message || text || 'Request failed', response.status, data)
  }

  return data as T
}
