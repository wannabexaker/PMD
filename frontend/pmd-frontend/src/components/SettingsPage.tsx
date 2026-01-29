import type { UiPreferences } from '../ui/uiPreferences'

type SettingsPageProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

export function SettingsPage({ preferences, onChange }: SettingsPageProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Settings</h2>
          <p className="muted">Control how selections persist while you navigate.</p>
        </div>
      </div>
      <div className="card">
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
      </div>
    </section>
  )
}
