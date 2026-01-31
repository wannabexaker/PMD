import type { NotificationPreferences } from '../types'
import { requestJson } from './http'

export const getNotificationPreferences = async () => {
  return requestJson<NotificationPreferences>('/api/notifications/preferences')
}

export const updateNotificationPreferences = async (payload: NotificationPreferences) => {
  return requestJson<NotificationPreferences>('/api/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
