import type { Workspace } from '../types'

/**
 * Demo workspaces carry their own expiry (deletionScheduledAt, set by the backend on
 * creation). Returns e.g. "Demo · until 4 Dec", or plain "Demo" when no date is known.
 */
export function demoPillLabel(workspace: Pick<Workspace, 'deletionScheduledAt'> | null | undefined): string {
  const iso = workspace?.deletionScheduledAt
  if (!iso) return 'Demo'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Demo'
  return `Demo · until ${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
}

export const DEMO_PILL_TITLE =
  'Demo workspaces are deleted automatically after 7 days. You can create a new one afterwards.'
