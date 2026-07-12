// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { NotificationMailSettings } from './NotificationMailSettings'
import type { NotificationPreferences } from '../../types'

const prefs: NotificationPreferences = {
  emailOnAssign: true,
  emailOnMentionUser: false,
  emailOnMentionTeam: true,
  emailOnMentionComment: true,
  emailOnMentionDescription: true,
  emailOnMentionProjectTitle: true,
  emailOnProjectStatusChange: true,
  emailOnProjectMembershipChange: true,
  emailOnOverdueReminder: true,
  emailOnWorkspaceInviteCreated: true,
  emailOnWorkspaceJoinRequestSubmitted: true,
  emailOnWorkspaceJoinRequestDecision: true,
  emailOnWorkspaceInviteAccepted: false,
  emailOnWorkspaceInviteAcceptedDigest: true,
}

afterEach(() => cleanup())

describe('NotificationMailSettings', () => {
  it('renders all 14 email toggles with the correct checked state', () => {
    render(
      <NotificationMailSettings
        preferences={prefs}
        busy={false}
        browserPermission="default"
        onToggle={() => {}}
        onEnableBrowser={() => {}}
      />,
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(14)
    expect((screen.getByLabelText('Email when assigned') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Email on @mention') as HTMLInputElement).checked).toBe(false)
  })

  it('calls onToggle with the key and the next value', () => {
    const onToggle = vi.fn()
    render(
      <NotificationMailSettings
        preferences={prefs}
        busy={false}
        browserPermission="default"
        onToggle={onToggle}
        onEnableBrowser={() => {}}
      />,
    )
    fireEvent.click(screen.getByLabelText('Email on @mention')) // false -> true
    expect(onToggle).toHaveBeenCalledWith('emailOnMentionUser', true)
  })

  it('enables browser notifications and reflects granted state', () => {
    const onEnableBrowser = vi.fn()
    render(
      <NotificationMailSettings
        preferences={prefs}
        busy={false}
        browserPermission="default"
        onToggle={() => {}}
        onEnableBrowser={onEnableBrowser}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Enable' }))
    expect(onEnableBrowser).toHaveBeenCalledTimes(1)

    cleanup()
    render(
      <NotificationMailSettings
        preferences={prefs}
        busy={false}
        browserPermission="granted"
        onToggle={() => {}}
        onEnableBrowser={() => {}}
      />,
    )
    expect((screen.getByRole('button', { name: 'Enable' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByDisplayValue('Enabled')).toBeTruthy()
  })

  it('disables toggles while busy', () => {
    render(
      <NotificationMailSettings
        preferences={prefs}
        busy
        browserPermission="unsupported"
        onToggle={() => {}}
        onEnableBrowser={() => {}}
      />,
    )
    expect((screen.getByLabelText('Email when assigned') as HTMLInputElement).disabled).toBe(true)
  })
})
