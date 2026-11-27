import { describe, it, expect } from 'vitest'
import { loginRedirectState, readRegisteredEmail, readReturnPath, withRegisteredEmail } from './returnPath'

describe('readReturnPath', () => {
  it('returns the page that sent the user to /login, with its query and hash', () => {
    const state = loginRedirectState({ pathname: '/people', search: '?id=7', hash: '#top' })
    expect(readReturnPath(state)).toBe('/people?id=7#top')
  })

  it('ignores missing or malformed state', () => {
    expect(readReturnPath(null)).toBeNull()
    expect(readReturnPath(undefined)).toBeNull()
    expect(readReturnPath('x')).toBeNull()
    expect(readReturnPath({})).toBeNull()
    expect(readReturnPath({ from: { pathname: 42 } })).toBeNull()
  })

  it('never returns to the auth screens or the root redirect', () => {
    for (const pathname of ['/', '/login', '/register']) {
      expect(readReturnPath({ from: { pathname } })).toBeNull()
    }
  })

  it('carries the new account email from register to login, keeping from', () => {
    const from = loginRedirectState({ pathname: '/assign', search: '', hash: '' })
    const state = withRegisteredEmail(from, ' new@example.com ')
    expect(readRegisteredEmail(state)).toBe('new@example.com')
    expect(readReturnPath(state)).toBe('/assign')
    expect(readRegisteredEmail(withRegisteredEmail(state))).toBeUndefined()
    expect(withRegisteredEmail(null)).toBeNull()
  })

  it('only returns same-origin paths', () => {
    expect(readReturnPath({ from: { pathname: '//evil.example/x' } })).toBeNull()
    expect(readReturnPath({ from: { pathname: 'https://evil.example' } })).toBeNull()
    expect(readReturnPath({ from: { pathname: '/\\evil.example' } })).toBeNull()
  })
})
