import { ApiError, isApiError } from './http'

export type AppErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'rate_limited'
  | 'network'
  | 'server'
  | 'unknown'

export type AppErrorInfo = {
  kind: AppErrorKind
  status: number
  message: string
  code?: string | null
  fieldErrors?: Record<string, string> | null
  raw: unknown
}

const CODE_KIND_MAP: Record<string, AppErrorKind> = {
  VALIDATION_FAILED: 'validation',
  UNAUTHORIZED: 'unauthorized',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  CONFLICT: 'conflict',
  RATE_LIMITED: 'rate_limited',
  INTERNAL_ERROR: 'server',
  REQUEST_FAILED: 'unknown',
}

function fallbackMessageForKind(kind: AppErrorKind): string {
  switch (kind) {
    case 'validation':
      return 'Please check the form fields.'
    case 'unauthorized':
      return 'Authentication required.'
    case 'forbidden':
      return 'You do not have permission for this action.'
    case 'not_found':
      return 'Requested resource was not found.'
    case 'conflict':
      return 'Conflicting change detected. Refresh and retry.'
    case 'rate_limited':
      return 'Too many requests. Please wait and try again.'
    case 'network':
      return 'Cannot reach server. Check backend and try again.'
    case 'server':
      return 'Unexpected server error. Please try again.'
    default:
      return 'Request failed.'
  }
}

function isGenericBackendMessage(message: string, kind: AppErrorKind): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  if (normalized === 'request failed') {
    return true
  }
  if (kind === 'forbidden' && (normalized === 'forbidden' || normalized === 'not allowed')) {
    return true
  }
  if (kind === 'unauthorized' && (normalized === 'unauthorized' || normalized === 'authentication required')) {
    return true
  }
  return false
}

export function classifyError(error: unknown): AppErrorInfo {
  if (!isApiError(error)) {
    return {
      kind: 'unknown',
      status: -1,
      message: error instanceof Error ? error.message : fallbackMessageForKind('unknown'),
      raw: error,
    }
  }

  const apiError = error as ApiError
  const status = apiError.status
  const payload = apiError.data as Record<string, unknown> | null | undefined
  const code = typeof payload?.code === 'string' ? payload.code : null
  const fieldErrors =
    payload && typeof payload.fieldErrors === 'object' && payload.fieldErrors
      ? (payload.fieldErrors as Record<string, string>)
      : null

  const kindByStatus: AppErrorKind =
    status === 0
      ? 'network'
      : status === 400
        ? 'validation'
        : status === 401
          ? 'unauthorized'
          : status === 403
            ? 'forbidden'
            : status === 404
              ? 'not_found'
              : status === 409
                ? 'conflict'
                : status === 429
                  ? 'rate_limited'
                  : status >= 500
                    ? 'server'
                    : 'unknown'
  const kind: AppErrorKind = (code && CODE_KIND_MAP[code]) || kindByStatus

  const backendMessage = apiError.message?.trim() ?? ''
  const message = isGenericBackendMessage(backendMessage, kind)
    ? fallbackMessageForKind(kind)
    : backendMessage
  return { kind, status, message, code, fieldErrors, raw: error }
}

export function getErrorMessage(error: unknown, fallback?: string): string {
  const info = classifyError(error)
  if (info.message && info.message.trim().length > 0) {
    return info.message
  }
  return fallback ?? fallbackMessageForKind(info.kind)
}

export function isForbiddenError(error: unknown): boolean {
  const info = classifyError(error)
  return info.kind === 'forbidden'
}

export function getRequestId(error: unknown): string | null {
  if (!isApiError(error)) return null
  return error.requestId ?? null
}
