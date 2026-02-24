import type { NavigateFunction } from 'react-router-dom'
import { clearPeopleSelection, setPeopleSelectedFilters, setPeopleSelectedUserId } from '../ui/uiSelectionStore'
import type { MentionClickPayload } from './MentionText'

export function navigateFromMention(payload: MentionClickPayload, navigate: NavigateFunction) {
  if (payload.type === 'user' && payload.id) {
    setPeopleSelectedUserId(payload.id)
    setPeopleSelectedFilters([])
    navigate('/people')
    return
  }
  if (payload.type === 'team' && payload.id) {
    setPeopleSelectedUserId(null)
    setPeopleSelectedFilters([`team:${payload.id}`])
    navigate('/people')
    return
  }
  if (payload.type === 'everyone') {
    clearPeopleSelection()
    navigate('/people')
  }
}

