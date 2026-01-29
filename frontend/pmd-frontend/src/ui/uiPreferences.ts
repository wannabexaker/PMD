export type UiPreferences = {
  rememberDashboardProject: boolean
  rememberAssignProject: boolean
  rememberPeopleSelection: boolean
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  rememberDashboardProject: false,
  rememberAssignProject: false,
  rememberPeopleSelection: false,
}

const STORAGE_KEY = 'pmd_ui_preferences_v1'

export function loadUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_UI_PREFERENCES }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { ...DEFAULT_UI_PREFERENCES }
    }
    const parsed = JSON.parse(raw) as Partial<UiPreferences>
    return {
      rememberDashboardProject: Boolean(parsed.rememberDashboardProject),
      rememberAssignProject: Boolean(parsed.rememberAssignProject),
      rememberPeopleSelection: Boolean(parsed.rememberPeopleSelection),
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
