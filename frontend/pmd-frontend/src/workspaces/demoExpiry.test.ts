import { describe, expect, it } from 'vitest'
import { demoPillLabel } from './demoExpiry'

describe('demoPillLabel', () => {
  it('shows the expiry date when the backend sent one', () => {
    expect(demoPillLabel({ deletionScheduledAt: '2026-12-04T10:00:00Z' })).toMatch(/^Demo · until .*4/)
  })

  it('falls back to plain "Demo" without a usable date', () => {
    expect(demoPillLabel({ deletionScheduledAt: null })).toBe('Demo')
    expect(demoPillLabel({ deletionScheduledAt: 'not-a-date' })).toBe('Demo')
    expect(demoPillLabel(undefined)).toBe('Demo')
  })
})
