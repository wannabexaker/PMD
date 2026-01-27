import { useMemo, useState } from 'react'
import type { CreateProjectPayload, Project, ProjectStatus, UserSummary } from '../types'

const STATUSES: ProjectStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELED',
]

const MAX_PROJECT_TITLE_LENGTH = 32

type ProjectEditorProps = {
  users: UserSummary[]
  initial?: Project | null
  onSave: (payload: CreateProjectPayload) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
}

export function ProjectEditor({ users, initial, onSave, onCancel, submitLabel }: ProjectEditorProps) {
  const [form, setForm] = useState<CreateProjectPayload>({
    name: (initial?.name ?? '').slice(0, MAX_PROJECT_TITLE_LENGTH),
    description: initial?.description ?? '',
    status: (initial?.status ?? 'NOT_STARTED') as ProjectStatus,
    memberIds: initial?.memberIds ?? [],
  })
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleStatusChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    setForm((prev) => ({ ...prev, status: event.target.value as ProjectStatus }))
  }

  const handleMembersChange: React.ChangeEventHandler<HTMLSelectElement> = (event) => {
    const selected = Array.from(event.target.selectedOptions).map((option) => option.value)
    setForm((prev) => ({ ...prev, memberIds: selected }))
  }

  const teams = useMemo(() => {
    const values = new Set<string>()
    users.forEach((user) => {
      if (user.team) {
        values.add(user.team)
      }
    })
    return Array.from(values).sort()
  }, [users])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const team = user.team ?? ''
      const matchesQuery = !query || name.includes(query) || email.includes(query)
      const matchesTeam = !teamFilter || team === teamFilter
      return matchesQuery && matchesTeam
    })
  }, [users, search, teamFilter])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    try {
      setSubmitting(true)
      await onSave({
        name: form.name.trim().slice(0, MAX_PROJECT_TITLE_LENGTH),
        description: form.description?.trim() || undefined,
        status: form.status,
        memberIds: (form.memberIds ?? []).filter((id) => id),
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save project'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="form-grid two-col">
        <div className="form-field">
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            maxLength={MAX_PROJECT_TITLE_LENGTH}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="status">Status</label>
          <select id="status" value={form.status} onChange={handleStatusChange}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="form-field form-span-2">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={form.description ?? ''}
            onChange={handleChange}
            rows={3}
          />
        </div>
        <div className="form-field form-span-2">
          <label htmlFor="members">Members</label>
          <div className="member-filters">
            <input
              type="search"
              placeholder="Search by name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>
          <select
            id="members"
            multiple
            value={form.memberIds ?? []}
            onChange={handleMembersChange}
          >
            {filteredUsers.map((user, index) => (
              <option key={user.id ?? user.email ?? 'user-' + index} value={user.id ?? ''}>
                {(user.displayName ?? '-').trim()} {user.email ? `(${user.email})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : submitLabel ?? 'Save'}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}

