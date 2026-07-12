import { describe, it, expect } from 'vitest'
import { ApiError } from './http'
import { classifyError, getErrorMessage, isForbiddenError, getRequestId } from './errors'

describe('classifyError', () => {
  it('classifies by HTTP status', () => {
    expect(classifyError(new ApiError('x', 0)).kind).toBe('network')
    expect(classifyError(new ApiError('x', 400)).kind).toBe('validation')
    expect(classifyError(new ApiError('x', 401)).kind).toBe('unauthorized')
    expect(classifyError(new ApiError('x', 403)).kind).toBe('forbidden')
    expect(classifyError(new ApiError('x', 404)).kind).toBe('not_found')
    expect(classifyError(new ApiError('x', 409)).kind).toBe('conflict')
    expect(classifyError(new ApiError('x', 429)).kind).toBe('rate_limited')
    expect(classifyError(new ApiError('x', 503)).kind).toBe('server')
  })

  it('prefers an explicit backend error code over the status', () => {
    const err = new ApiError('nope', 400, { code: 'FORBIDDEN' })
    expect(classifyError(err).kind).toBe('forbidden')
  })

  it('replaces generic backend messages with a friendly fallback', () => {
    expect(classifyError(new ApiError('Forbidden', 403)).message).toBe(
      'You do not have permission for this action.',
    )
    expect(classifyError(new ApiError('Request failed', 500)).message).toBe(
      'Unexpected server error. Please try again.',
    )
  })

  it('keeps specific, non-generic backend messages', () => {
    expect(getErrorMessage(new ApiError('Team name already exists', 409))).toBe(
      'Team name already exists',
    )
  })

  it('handles non-ApiError values', () => {
    expect(classifyError(new Error('boom')).kind).toBe('unknown')
    expect(getRequestId(new Error('boom'))).toBeNull()
  })

  it('exposes forbidden + request id helpers', () => {
    expect(isForbiddenError(new ApiError('x', 403))).toBe(true)
    expect(isForbiddenError(new ApiError('x', 404))).toBe(false)
    expect(getRequestId(new ApiError('x', 403, null, 'req-42'))).toBe('req-42')
  })
})
