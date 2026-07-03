import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { loadUiPreferences, DEFAULT_UI_PREFERENCES } from './uiPreferences'

// loadUiPreferences only reads storage when `window` exists; provide it locally
// (scoped to this file) so the normalization logic is actually exercised.
type MaybeWindow = { window?: unknown }

describe('loadUiPreferences', () => {
  const hadWindow = 'window' in globalThis

  beforeEach(() => {
    ;(globalThis as MaybeWindow).window = globalThis
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    if (!hadWindow) {
      delete (globalThis as MaybeWindow).window
    }
  })

  it('returns defaults when nothing is stored', () => {
    expect(loadUiPreferences()).toEqual(DEFAULT_UI_PREFERENCES)
  })

  it('normalizes invalid stored values to safe defaults', () => {
    localStorage.setItem(
      'pmd_ui_preferences_v2',
      JSON.stringify({
        defaultLandingPage: 'nonsense',
        dateTimeFormat: 'weird',
        autoRefreshIntervalSeconds: 999,
        settingsDefaultView: 'bogus',
      }),
    )
    const prefs = loadUiPreferences()
    expect(prefs.defaultLandingPage).toBe('dashboard')
    expect(prefs.dateTimeFormat).toBe('24h')
    expect(prefs.autoRefreshIntervalSeconds).toBe(0)
    expect(prefs.settingsDefaultView).toBe('grid')
  })

  it('preserves valid stored values', () => {
    localStorage.setItem(
      'pmd_ui_preferences_v2',
      JSON.stringify({
        defaultLandingPage: 'people',
        dateTimeFormat: '12h',
        autoRefreshIntervalSeconds: 60,
        settingsDefaultView: 'tabs',
      }),
    )
    const prefs = loadUiPreferences()
    expect(prefs.defaultLandingPage).toBe('people')
    expect(prefs.dateTimeFormat).toBe('12h')
    expect(prefs.autoRefreshIntervalSeconds).toBe(60)
    expect(prefs.settingsDefaultView).toBe('tabs')
  })

  it('falls back to defaults on corrupt JSON', () => {
    localStorage.setItem('pmd_ui_preferences_v2', '{not valid json')
    expect(loadUiPreferences()).toEqual(DEFAULT_UI_PREFERENCES)
  })
})
