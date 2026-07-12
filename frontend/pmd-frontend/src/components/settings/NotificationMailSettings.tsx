import { useMemo } from 'react'
import type { NotificationPreferences } from '../../types'

export type BrowserPermissionState = NotificationPermission | 'unsupported'

type NotificationMailSettingsProps = {
  preferences: NotificationPreferences
  busy: boolean
  browserPermission: BrowserPermissionState
  onToggle: (key: keyof NotificationPreferences, next: boolean) => void
  onEnableBrowser: () => void
}

// Row order/labels for the email notification toggles. Displayed alphabetically
// by label (see the sort below) — kept identical to the previous inline version.
const NOTIFICATION_ROWS: Array<{ key: keyof NotificationPreferences; label: string }> = [
  { key: 'emailOnAssign', label: 'Email when assigned' },
  { key: 'emailOnMentionUser', label: 'Email on @mention' },
  { key: 'emailOnMentionTeam', label: 'Email on @teammention' },
  { key: 'emailOnMentionComment', label: 'Email mention from comments' },
  { key: 'emailOnMentionDescription', label: 'Email mention from project descriptions' },
  { key: 'emailOnMentionProjectTitle', label: 'Email mention from project titles' },
  { key: 'emailOnProjectMembershipChange', label: 'Email when added/removed from a project' },
  { key: 'emailOnProjectStatusChange', label: 'Email when project status changes' },
  { key: 'emailOnOverdueReminder', label: 'Email overdue reminders' },
  { key: 'emailOnWorkspaceInviteCreated', label: 'Email when direct invite is created' },
  { key: 'emailOnWorkspaceJoinRequestSubmitted', label: 'Email when join request is submitted' },
  { key: 'emailOnWorkspaceJoinRequestDecision', label: 'Email when join request is approved/denied' },
  { key: 'emailOnWorkspaceInviteAccepted', label: 'Email when invited member joins workspace (instant)' },
  { key: 'emailOnWorkspaceInviteAcceptedDigest', label: 'Email digest for invited members who joined' },
]

function browserPermissionLabel(state: BrowserPermissionState): string {
  switch (state) {
    case 'unsupported':
      return 'Unsupported'
    case 'granted':
      return 'Enabled'
    case 'denied':
      return 'Blocked'
    default:
      return 'Not enabled'
  }
}

/**
 * The "Mail" section of the Settings > Notifications panel: the email-notification
 * toggles plus the browser-notification enable control. The surrounding panel
 * chrome (drag/resize/order/coming-soon) stays in SettingsPage since it is shared
 * by every panel.
 */
export function NotificationMailSettings({
  preferences,
  busy,
  browserPermission,
  onToggle,
  onEnableBrowser,
}: NotificationMailSettingsProps) {
  const rows = useMemo(
    () =>
      NOTIFICATION_ROWS.map((row) => ({ ...row, checked: preferences[row.key] })).sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    [preferences],
  )

  return (
    <div className="settings-tab-main workspace-actions">
      {rows.map((row) => (
        <label key={`notification-row-${row.key}`} className="checkbox-row">
          <input
            type="checkbox"
            checked={row.checked}
            onChange={(event) => onToggle(row.key, event.target.checked)}
            disabled={busy}
          />
          <span>{row.label}</span>
        </label>
      ))}
      <div className="workspace-divider" />
      <div className="form-field">
        <label>Browser notifications</label>
        <div className="workspace-row">
          <input value={browserPermissionLabel(browserPermission)} readOnly />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onEnableBrowser}
            disabled={browserPermission === 'unsupported' || browserPermission === 'granted'}
          >
            Enable
          </button>
        </div>
      </div>
    </div>
  )
}
