import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requestJson, refreshAccessToken, registerAuthRefreshHandler } from './http'

describe('requestJson single-flight refresh', () => {
  beforeEach(() => registerAuthRefreshHandler(null))
  afterEach(() => vi.unstubAllGlobals())

  it('runs ONE refresh for concurrent 401s, then retries each request', async () => {
    let refreshCalls = 0
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>
      if (headers.Authorization === 'Bearer fresh') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ message: 'unauthorized' }), { status: 401 })
    })
    vi.stubGlobal('fetch', fetchMock)

    registerAuthRefreshHandler(async () => {
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 15))
      return 'fresh'
    })

    const results = await Promise.all([
      requestJson<{ ok: boolean }>('/api/a'),
      requestJson<{ ok: boolean }>('/api/b'),
      requestJson<{ ok: boolean }>('/api/c'),
    ])

    expect(refreshCalls).toBe(1)
    expect(results.every((r) => r.ok)).toBe(true)
  })

  it('does not attempt refresh for auth endpoints', async () => {
    let refreshCalls = 0
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ message: 'bad creds' }), { status: 401 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    registerAuthRefreshHandler(async () => {
      refreshCalls += 1
      return 'fresh'
    })

    await expect(requestJson('/api/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
    })
    expect(refreshCalls).toBe(0)
  })

  it('shares one refresh between the session bootstrap and a concurrent 401 retry', async () => {
    let refreshCalls = 0
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>
      if (headers.Authorization === 'Bearer fresh') {
        return new Response(JSON.stringify({ ok: true }), { status: 200 })
      }
      return new Response(JSON.stringify({ message: 'unauthorized' }), { status: 401 })
    })
    vi.stubGlobal('fetch', fetchMock)
    registerAuthRefreshHandler(async () => {
      refreshCalls += 1
      await new Promise((resolve) => setTimeout(resolve, 15))
      return 'fresh'
    })

    // StrictMode runs the bootstrap twice; both must reuse the same rotation.
    const [first, second, retried] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
      requestJson<{ ok: boolean }>('/api/a'),
    ])

    expect(refreshCalls).toBe(1)
    expect(first).toBe('fresh')
    expect(second).toBe('fresh')
    expect(retried.ok).toBe(true)
  })

  it('resolves the bootstrap refresh to null when the refresh fails', async () => {
    registerAuthRefreshHandler(async () => {
      throw new Error('no session')
    })
    expect(await refreshAccessToken()).toBeNull()
  })
})
