import { requestJson } from './http'
import type { WorkspacePanelPreferences } from '../types'

export async function fetchWorkspacePanelPreferences(
  workspaceId: string
): Promise<WorkspacePanelPreferences> {
  return requestJson<WorkspacePanelPreferences>(`/api/workspaces/${workspaceId}/preferences/panels`)
}

export async function saveWorkspacePanelPreferences(
  workspaceId: string,
  payload: WorkspacePanelPreferences
): Promise<WorkspacePanelPreferences> {
  return requestJson<WorkspacePanelPreferences>(`/api/workspaces/${workspaceId}/preferences/panels`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
