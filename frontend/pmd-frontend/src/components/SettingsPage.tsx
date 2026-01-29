import type { UiPreferences } from '../ui/uiPreferences'
import { useToast } from '../shared/ui/toast/ToastProvider'
import { useTeams } from '../teams/TeamsContext'
import { useWorkspace } from '../workspaces/WorkspaceContext'

type SettingsPageProps = {
  preferences: UiPreferences
  onChange: (next: UiPreferences) => void
}

export function SettingsPage({ preferences, onChange }: SettingsPageProps) {
  const { activeWorkspace, enterDemo, resetDemo } = useWorkspace()
  const { refresh: refreshTeams } = useTeams()
  const { showToast } = useToast()

  const handleEnterDemo = async () => {
    const demo = await enterDemo()
    if (demo?.id) {
      showToast({ type: 'success', message: 'Entered Demo Workspace.' })
    } else {
      showToast({ type: 'error', message: 'Failed to enter Demo Workspace.' })
    }
  }

  const handleResetDemo = async () => {
    const confirmed = window.confirm('Reset the Demo Workspace back to the seeded data?')
    if (!confirmed) return
    const ok = await resetDemo()
    if (ok) {
      await refreshTeams()
      window.dispatchEvent(new CustomEvent('pmd:workspace-reset'))
    }
    showToast({
      type: ok ? 'success' : 'error',
      message: ok ? 'Demo Workspace reset.' : 'Failed to reset Demo Workspace.',
    })
  }

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
      <div className="card">
        <div className="panel-header">
          <div>
            <h3>Demo Workspace</h3>
            <p className="muted">Explore seeded data without affecting real workspaces.</p>
          </div>
        </div>
        <div className="row space">
          <button type="button" className="btn btn-secondary" onClick={handleEnterDemo}>
            Enter Demo Workspace
          </button>
          {activeWorkspace?.demo ? (
            <button type="button" className="btn btn-danger" onClick={handleResetDemo}>
              Reset Demo Workspace
            </button>
          ) : null}
        </div>
        {activeWorkspace?.demo ? (
          <p className="muted">You are currently in the Demo Workspace.</p>
        ) : null}
      </div>
    </section>
  )
}
