import { describe, expect, it } from 'vitest'
import { displayEmail } from './displayEmail'

describe('displayEmail', () => {
  it('drops the +tag from internal demo aliases', () => {
    expect(displayEmail('alex.johnson+6b0971aa33@pmd.local')).toBe('alex.johnson@pmd.local')
    expect(displayEmail('Alex+abc@PMD.LOCAL')).toBe('Alex@PMD.LOCAL')
  })

  it('leaves real addresses alone, including real +tags', () => {
    expect(displayEmail('alex@example.com')).toBe('alex@example.com')
    expect(displayEmail('alex+news@gmail.com')).toBe('alex+news@gmail.com')
    expect(displayEmail('alex.johnson@pmd.local')).toBe('alex.johnson@pmd.local')
  })

  it('handles empty and malformed input', () => {
    expect(displayEmail(null)).toBe('')
    expect(displayEmail(undefined)).toBe('')
    expect(displayEmail('  ')).toBe('')
    expect(displayEmail('no-at-sign')).toBe('no-at-sign')
    expect(displayEmail('+tag@pmd.local')).toBe('+tag@pmd.local')
  })
})
