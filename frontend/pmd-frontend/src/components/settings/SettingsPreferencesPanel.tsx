import type { UiPreferences } from '../../ui/uiPreferences'

type SettingsPreferencesPanelProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

/**
 * Body of the Settings > Preferences panel (landing page, remember toggles,
 * keyboard shortcuts, require-team, date/time format). The shared panel chrome
 * stays in SettingsPage; this body is pure: it reads preferences and emits onChange.
 */
export function SettingsPreferencesPanel({ preferences, onChange }: SettingsPreferencesPanelProps) {
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
