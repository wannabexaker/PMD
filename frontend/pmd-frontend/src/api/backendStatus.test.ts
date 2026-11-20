import { describe, it, expect, vi } from 'vitest'
import { probeBackend } from './backendStatus'

function respond(status: number, body: unknown, json = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: json ? () => Promise.resolve(body) : () => Promise.reject(new SyntaxError('not json')),
  }) as unknown as typeof fetch
}

describe('probeBackend', () => {
  it('is online only for a 200 with status UP', async () => {
    expect(await probeBackend(respond(200, { status: 'UP' }))).toBe('online')
  })

  it('treats the proxy 502 of a stopped demo backend as offline', async () => {
    expect(await probeBackend(respond(502, null, false))).toBe('offline')
  })

  it('treats a health check reporting DOWN as offline', async () => {
    expect(await probeBackend(respond(503, { status: 'DOWN' }))).toBe('offline')
    expect(await probeBackend(respond(200, { status: 'DOWN' }))).toBe('offline')
  })

  it('treats an HTML page where JSON was expected as offline', async () => {
    // A missing proxy rule falls through to the SPA shell: 200, but not the backend.
    expect(await probeBackend(respond(200, null, false))).toBe('offline')
  })

  it('treats a network error as offline', async () => {
    const failing = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch
    expect(await probeBackend(failing)).toBe('offline')
  })

  it('gives up after the timeout instead of hanging the form', async () => {
    const hanging = vi.fn((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
    ) as unknown as typeof fetch
    expect(await probeBackend(hanging, 20)).toBe('offline')
  })
})
