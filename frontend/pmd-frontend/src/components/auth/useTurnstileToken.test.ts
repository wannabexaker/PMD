// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTurnstileToken } from './useTurnstileToken'

describe('useTurnstileToken', () => {
  it('a submit waits for a token that arrives later', async () => {
    const { result } = renderHook(() => useTurnstileToken())
    const pending = result.current.waitForToken(5000)
    act(() => result.current.setToken('tok-1'))
    await expect(pending).resolves.toBe('tok-1')
  })

  it('resolves at once when the token is already there', async () => {
    const { result } = renderHook(() => useTurnstileToken())
    act(() => result.current.setToken('tok-2'))
    await expect(result.current.waitForToken()).resolves.toBe('tok-2')
  })

  it('gives up with an empty string after the timeout', async () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useTurnstileToken())
    const pending = result.current.waitForToken(1000)
    vi.advanceTimersByTime(1001)
    await expect(pending).resolves.toBe('')
    vi.useRealTimers()
  })
})
