import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatDateTime } from './formatDateTime'

const afternoon = new Date(2026, 10, 27, 14, 5, 7)

describe('formatDateTime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an empty string for empty or invalid input', () => {
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
    expect(formatDateTime('not a date')).toBe('')
  })

  it('uses a 24-hour clock when asked', () => {
    const text = formatDateTime(afternoon, { format: '24h', locale: 'en-US' })
    expect(text).toContain('14:05')
    expect(text).not.toMatch(/PM/i)
  })

  it('uses a 12-hour clock when asked', () => {
    const text = formatDateTime(afternoon, { format: '12h', locale: 'en-GB' })
    expect(text).toMatch(/2:05\s?pm/i)
    expect(text).not.toContain('14:05')
  })

  it('shows midnight as 00 in 24-hour mode', () => {
    expect(formatDateTime(new Date(2026, 0, 1, 0, 30), { format: '24h', locale: 'en-US' })).toContain('00:30')
  })

  it('adds seconds only when asked', () => {
    expect(formatDateTime(afternoon, { format: '24h', locale: 'en-GB' })).not.toContain('14:05:07')
    expect(formatDateTime(afternoon, { format: '24h', locale: 'en-GB', withSeconds: true })).toContain('14:05:07')
  })

  it('accepts ISO strings and epoch numbers', () => {
    expect(formatDateTime(afternoon.toISOString(), { format: '24h', locale: 'en-GB' })).toContain('14:05')
    expect(formatDateTime(afternoon.getTime(), { format: '24h', locale: 'en-GB' })).toContain('14:05')
  })

  it('falls back to the stored preference', () => {
    const store = new Map<string, string>([['pmd_ui_preferences_v2', JSON.stringify({ dateTimeFormat: '12h' })]])
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', { getItem: (key: string) => store.get(key) ?? null })
    expect(formatDateTime(afternoon, { locale: 'en-GB' })).toMatch(/2:05\s?pm/i)
    store.set('pmd_ui_preferences_v2', JSON.stringify({ dateTimeFormat: '24h' }))
    expect(formatDateTime(afternoon, { locale: 'en-GB' })).toContain('14:05')
  })
})
