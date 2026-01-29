const DASHBOARD_KEY = 'pmd_ui_dashboard_selected_project'
const ASSIGN_KEY = 'pmd_ui_assign_selected_project'
const PEOPLE_USER_KEY = 'pmd_ui_people_selected_user'
const PEOPLE_FILTERS_KEY = 'pmd_ui_people_filters'

function safeSessionGet(key: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  return sessionStorage.getItem(key)
}

function safeSessionSet(key: string, value: string) {
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.setItem(key, value)
}

function safeSessionRemove(key: string) {
  if (typeof window === 'undefined') {
    return
  }
  sessionStorage.removeItem(key)
}

export function getDashboardSelectedProjectId(): string | null {
  return safeSessionGet(DASHBOARD_KEY)
}

export function setDashboardSelectedProjectId(value: string | null) {
  if (!value) {
    safeSessionRemove(DASHBOARD_KEY)
    return
  }
  safeSessionSet(DASHBOARD_KEY, value)
}

export function clearDashboardSelectedProjectId() {
  safeSessionRemove(DASHBOARD_KEY)
}

export function getAssignSelectedProjectId(): string | null {
  return safeSessionGet(ASSIGN_KEY)
}

export function setAssignSelectedProjectId(value: string | null) {
  if (!value) {
    safeSessionRemove(ASSIGN_KEY)
    return
  }
  safeSessionSet(ASSIGN_KEY, value)
}

export function clearAssignSelectedProjectId() {
  safeSessionRemove(ASSIGN_KEY)
}

export function getPeopleSelectedUserId(): string | null {
  return safeSessionGet(PEOPLE_USER_KEY)
}

export function setPeopleSelectedUserId(value: string | null) {
  if (!value) {
    safeSessionRemove(PEOPLE_USER_KEY)
    return
  }
  safeSessionSet(PEOPLE_USER_KEY, value)
}

export function getPeopleSelectedFilters(): string[] {
  const raw = safeSessionGet(PEOPLE_FILTERS_KEY)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : []
  } catch {
    return []
  }
}

export function setPeopleSelectedFilters(values: string[]) {
  if (!values || values.length === 0) {
    safeSessionRemove(PEOPLE_FILTERS_KEY)
    return
  }
  safeSessionSet(PEOPLE_FILTERS_KEY, JSON.stringify(values))
}

export function clearPeopleSelection() {
  safeSessionRemove(PEOPLE_USER_KEY)
  safeSessionRemove(PEOPLE_FILTERS_KEY)
}

export function clearUiSelections() {
  clearDashboardSelectedProjectId()
  clearAssignSelectedProjectId()
  clearPeopleSelection()
}
