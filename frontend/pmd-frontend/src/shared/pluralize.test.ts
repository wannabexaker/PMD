import { describe, expect, it } from 'vitest'
import { pluralize } from './pluralize'

describe('pluralize', () => {
  it('uses the singular for exactly one', () => {
    expect(pluralize(1, 'member')).toBe('1 member')
  })

  it('uses the plural for zero and many', () => {
    expect(pluralize(0, 'member')).toBe('0 members')
    expect(pluralize(3, 'member')).toBe('3 members')
  })

  it('accepts an irregular plural', () => {
    expect(pluralize(1, 'person', 'people')).toBe('1 person')
    expect(pluralize(2, 'person', 'people')).toBe('2 people')
  })
})
