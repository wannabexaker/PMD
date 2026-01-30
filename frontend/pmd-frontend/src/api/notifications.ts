import type { NotificationPreferences } from '../types'
import { apiFetch } from './http'

export const getNotificationPreferences = async () => {
  return apiFetch<NotificationPreferences>('/api/notifications/preferences')
}

export const updateNotificationPreferences = async (payload: NotificationPreferences) => {
  return apiFetch<NotificationPreferences>('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
