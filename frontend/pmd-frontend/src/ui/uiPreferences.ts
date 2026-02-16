export type UiPreferences = {
  rememberDashboardProject: boolean
  rememberAssignProject: boolean
  rememberPeopleSelection: boolean
  defaultLandingPage: 'dashboard' | 'assign' | 'people' | 'settings'
  confirmDestructiveActions: boolean
  keyboardShortcutsEnabled: boolean
  dateTimeFormat: '24h' | '12h'
  compactMode: boolean
  rememberOpenPanels: boolean
  defaultFiltersPreset: boolean
  autoRefreshIntervalSeconds: 0 | 30 | 60
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  rememberDashboardProject: false,
  rememberAssignProject: false,
  rememberPeopleSelection: false,
  defaultLandingPage: 'dashboard',
  confirmDestructiveActions: true,
  keyboardShortcutsEnabled: true,
  dateTimeFormat: '24h',
  compactMode: false,
  rememberOpenPanels: false,
  defaultFiltersPreset: false,
  autoRefreshIntervalSeconds: 0,
}

const STORAGE_KEY = 'pmd_ui_preferences_v2'
const LEGACY_STORAGE_KEY = 'pmd_ui_preferences_v1'

function normalizeLandingPage(value: unknown): UiPreferences['defaultLandingPage'] {
  return value === 'assign' || value === 'people' || value === 'settings' ? value : 'dashboard'
}

function normalizeDateTimeFormat(value: unknown): UiPreferences['dateTimeFormat'] {
  return value === '12h' ? '12h' : '24h'
}

function normalizeAutoRefresh(value: unknown): UiPreferences['autoRefreshIntervalSeconds'] {
  return value === 30 || value === 60 ? value : 0
}

export function loadUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_UI_PREFERENCES }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_UI_PREFERENCES }
    }
    const parsed = JSON.parse(raw) as Partial<UiPreferences>
    return {
      rememberDashboardProject: Boolean(parsed.rememberDashboardProject),
      rememberAssignProject: Boolean(parsed.rememberAssignProject),
      rememberPeopleSelection: Boolean(parsed.rememberPeopleSelection),
      defaultLandingPage: normalizeLandingPage(parsed.defaultLandingPage),
      confirmDestructiveActions:
        parsed.confirmDestructiveActions === undefined ? true : Boolean(parsed.confirmDestructiveActions),
      keyboardShortcutsEnabled:
        parsed.keyboardShortcutsEnabled === undefined ? true : Boolean(parsed.keyboardShortcutsEnabled),
      dateTimeFormat: normalizeDateTimeFormat(parsed.dateTimeFormat),
      compactMode: Boolean(parsed.compactMode),
      rememberOpenPanels: Boolean(parsed.rememberOpenPanels),
      defaultFiltersPreset: Boolean(parsed.defaultFiltersPreset),
      autoRefreshIntervalSeconds: normalizeAutoRefresh(parsed.autoRefreshIntervalSeconds),
    }
  } catch {
    return { ...DEFAULT_UI_PREFERENCES }
  }
}

export function saveUiPreferences(prefs: UiPreferences) {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function clearUiPreferences() {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(STORAGE_KEY)
}
