import type { UiPreferences } from '../../ui/uiPreferences'
import type { SettingsViewMode } from './settingsConfig'

type SettingsPreferencesPanelProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
  onSettingsViewModeChange: (mode: SettingsViewMode) => void
}

/**
 * Body of the Settings > Preferences panel (landing page, default view,
 * remember toggles, keyboard shortcuts, require-team, grid-resize, date/time
 * format). The shared panel chrome and the "Coming soon" side stay in
 * SettingsPage; this body is pure: it reads preferences and emits onChange.
 */
export function SettingsPreferencesPanel({ preferences, onChange, onSettingsViewModeChange }: SettingsPreferencesPanelProps) {
  return (
                <div className="settings-tab-main">
                  <div className="form-field">
                    <label htmlFor="prefDefaultLanding">Default landing page</label>
                    <select
                      id="prefDefaultLanding"
                      value={preferences.defaultLandingPage}
                      onChange={(event) =>
                        onChange({
                          ...preferences,
                          defaultLandingPage: event.target.value as typeof preferences.defaultLandingPage,
                        })
                      }
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="assign">Assign</option>
                      <option value="people">People</option>
                      <option value="settings">Settings</option>
                      <option value="lastVisited">Last visited route</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label htmlFor="prefSettingsDefaultView">Default settings view</label>
                    <select
                      id="prefSettingsDefaultView"
                      value={preferences.settingsDefaultView}
                      onChange={(event) => {
                        const nextView = (event.target.value === 'tabs' ? 'tabs' : 'grid') as UiPreferences['settingsDefaultView']
                        onChange({
                          ...preferences,
                          settingsDefaultView: nextView,
                        })
                        onSettingsViewModeChange(nextView)
                      }}
                    >
                      <option value="grid">Grid view</option>
                      <option value="tabs">Tab view</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.rememberDashboardProject}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            rememberDashboardProject: event.target.checked,
                          })
                        }
                      />
                      <span>Remember selected project on Dashboard</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.rememberAssignProject}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            rememberAssignProject: event.target.checked,
                          })
                        }
                      />
                      <span>Remember selected project on Assign</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.rememberPeopleSelection}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            rememberPeopleSelection: event.target.checked,
                          })
                        }
                      />
                      <span>Remember selections on People</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.confirmDestructiveActions}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            confirmDestructiveActions: event.target.checked,
                          })
                        }
                      />
                      <span>Confirm destructive actions</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.keyboardShortcutsEnabled}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            keyboardShortcutsEnabled: event.target.checked,
                          })
                        }
                      />
                      <span>Enable keyboard shortcuts</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.requireTeamOnProjectCreate}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            requireTeamOnProjectCreate: event.target.checked,
                          })
                        }
                      />
                      <span>Require team when creating project</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={preferences.settingsGridResizeEnabled}
                        onChange={(event) =>
                          onChange({
                            ...preferences,
                            settingsGridResizeEnabled: event.target.checked,
                          })
                        }
                      />
                      <span>Enable settings grid panel resize</span>
                    </label>
                  </div>
                  <div className="form-field">
                    <label htmlFor="prefDateTimeFormat">Date/time format</label>
                    <select
                      id="prefDateTimeFormat"
                      value={preferences.dateTimeFormat}
                      onChange={(event) =>
                        onChange({
                          ...preferences,
                          dateTimeFormat: event.target.value as typeof preferences.dateTimeFormat,
                        })
                      }
                    >
                      <option value="24h">24-hour</option>
                      <option value="12h">12-hour</option>
                    </select>
                  </div>
                </div>
  )
}
