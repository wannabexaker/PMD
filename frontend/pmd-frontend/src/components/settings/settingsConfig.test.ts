import { describe, expect, it } from 'vitest'
import { auditActionLabel, auditCategoryLabel, formatAuditTime } from './settingsConfig'

describe('audit labels', () => {
  it('maps known codes to human labels', () => {
    expect(auditCategoryLabel('REQUEST')).toBe('Join request')
    expect(auditActionLabel('ASSIGN_ROLE')).toBe('Role assigned')
    expect(auditActionLabel('create')).toBe('Created')
  })

  it('humanizes unknown codes and handles empty values', () => {
    expect(auditActionLabel('SOME_NEW_THING')).toBe('Some new thing')
    expect(auditCategoryLabel(null)).toBe('-')
    expect(auditActionLabel('')).toBe('-')
  })
})

describe('formatAuditTime', () => {
  it('honours the 12h/24h preference', () => {
    const iso = '2026-11-27T15:05:00Z'
    const h24 = formatAuditTime(iso, '24h')
    const h12 = formatAuditTime(iso, '12h')
    expect(h24).toContain('2026')
    expect(h12).not.toEqual(h24)
    expect(h12.toLowerCase()).toMatch(/am|pm/)
  })

  it('returns an empty string for missing or invalid dates', () => {
    expect(formatAuditTime(null, '24h')).toBe('')
    expect(formatAuditTime('not-a-date', '24h')).toBe('')
  })
})
