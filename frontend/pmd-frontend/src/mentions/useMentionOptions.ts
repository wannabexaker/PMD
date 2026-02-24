import { useEffect, useMemo, useState } from 'react'
import type { Team, UserSummary, WorkspaceRole } from '../types'
import { listRoles } from '../api/workspaces'
import { useWorkspace } from '../workspaces/WorkspaceContext'
import { useTeams } from '../teams/TeamsContext'

export type MentionOptionType = 'everyone' | 'team' | 'role' | 'user'

export type MentionOption = {
  key: string
  type: MentionOptionType
  label: string
  hint?: string
  accentColor?: string
  insertText: string
  searchable: string
}

function teamInsertText(team: Team) {
  const name = (team.name ?? 'Team').trim()
  const teamId = (team.id ?? '').trim()
  if (!teamId) {
    return `@${name}`
  }
  return `@${name}{team:${teamId}}`
}

function roleInsertText(role: WorkspaceRole) {
  const name = (role.name ?? 'Role').trim()
  const roleId = (role.id ?? '').trim()
  if (!roleId) {
    return `@${name}`
  }
  return `@${name}{role:${roleId}}`
}

function userInsertText(user: UserSummary) {
  const label = (user.displayName ?? user.email ?? 'User').trim()
  const userId = (user.id ?? '').trim()
  if (!userId) {
    return `@${label}`
  }
  return `@${label}{user:${userId}}`
}

export function useMentionOptions(users: UserSummary[]) {
  const { activeWorkspaceId } = useWorkspace()
  const { teams } = useTeams()
  const [roles, setRoles] = useState<WorkspaceRole[]>([])
  const teamsById = useMemo(() => {
    const map = new Map<string, Team>()
    teams.forEach((team) => {
      if (team.id) {
        map.set(team.id, team)
      }
    })
    return map
  }, [teams])

  useEffect(() => {
    if (!activeWorkspaceId) {
      setRoles([])
      return
    }
    let active = true
    listRoles(activeWorkspaceId)
      .then((data) => {
        if (!active) return
        setRoles((data ?? []).filter((role) => Boolean(role.id && role.name)))
      })
      .catch(() => {
        if (!active) return
        setRoles([])
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  return useMemo<MentionOption[]>(() => {
    const options: MentionOption[] = [
      {
        key: 'everyone',
        type: 'everyone',
        label: 'everyone',
        hint: 'Notify all workspace members',
        insertText: '@everyone',
        searchable: 'everyone all workspace',
      },
    ]

    teams
      .filter((team) => Boolean(team.id && team.name))
      .forEach((team) => {
        const name = (team.name ?? '').trim()
        if (!name) return
        options.push({
          key: `team:${team.id}`,
          type: 'team',
          label: name,
          hint: 'Team',
          accentColor: team.color ?? '#3B82F6',
          insertText: teamInsertText(team),
          searchable: `${name} team ${(team.slug ?? '').trim()}`.toLowerCase(),
        })
      })

    roles.forEach((role) => {
      const name = (role.name ?? '').trim()
      if (!name) return
      options.push({
        key: `role:${role.id}`,
        type: 'role',
        label: name,
        hint: 'Role',
        insertText: roleInsertText(role),
        searchable: `${name} role`.toLowerCase(),
      })
    })

    users
      .filter((user) => Boolean(user.id && (user.displayName || user.email)))
      .forEach((user) => {
        const label = (user.displayName ?? user.email ?? '').trim()
        if (!label) return
        const team = user.teamId ? teamsById.get(user.teamId) : null
        const teamLabel = team?.name?.trim() ? team.name.trim() : 'No team'
        const hintParts = [user.email ?? 'User', teamLabel]
        options.push({
          key: `user:${user.id}`,
          type: 'user',
          label,
          hint: hintParts.join(' · '),
          accentColor: team?.color ?? '#64748b',
          insertText: userInsertText(user),
          searchable: `${label} ${user.email ?? ''} ${teamLabel} user ${(user.roleName ?? '')}`.toLowerCase(),
        })
      })

    return options
  }, [roles, teams, teamsById, users])
}
