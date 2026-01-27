import { useMemo, useState } from 'react'
import { createProject } from '../api/projects'
import type { CreateProjectPayload, Project, ProjectStatus, User, UserSummary } from '../types'

type CreateProjectFormProps = {
  users: UserSummary[]
  currentUser: User | null
  onCreated: (project?: Project) => void
}

const MAX_PROJECT_TITLE_LENGTH = 32
const STATUSES: ProjectStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED']

function normalizeTeam(value?: string | null) {
  return (value ?? '').trim().toLowerCase()
}

export function CreateProjectForm({ users, currentUser, onCreated }: CreateProjectFormProps) {
  const [form, setForm] = useState<CreateProjectPayload>({
    name: '',
    description: '',
    status: 'NOT_STARTED',
    memberIds: [],
  })
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const teams = useMemo(() => {
    const values = new Set<string>()
    users.forEach((user) => {
      const team = user.team
      if (!team || normalizeTeam(team) === 'admin') {
        return
      }
      values.add(team)
    })
    return Array.from(values).sort((a, b) => a.localeCompare(b))
  }, [users])

  const eligibleUsers = useMemo(() => {
    return users.filter((user) => {
      if (!user.id) return false
      return normalizeTeam(user.team) !== 'admin'
    })
  }, [users])

  const selectedIds = useMemo(() => new Set(form.memberIds ?? []), [form.memberIds])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return eligibleUsers.filter((user) => {
      const name = user.displayName?.toLowerCase() ?? ''
      const email = user.email?.toLowerCase() ?? ''
      const matchesQuery = !query || name.includes(query) || email.includes(query)
      const matchesTeam = !teamFilter || (user.team ?? '') === teamFilter
      return matchesQuery && matchesTeam
    })
  }, [eligibleUsers, search, teamFilter])

  const selectedMembers = useMemo(() => {
    return eligibleUsers.filter((user) => (user.id ? selectedIds.has(user.id) : false))
  }, [eligibleUsers, selectedIds])

  const toggleMember = (id?: string | null) => {
    if (!id) return
    setForm((prev) => {
      const current = prev.memberIds ?? []
      const exists = current.includes(id)
      const next = exists ? current.filter((value) => value !== id) : [...current, id]
      return { ...prev, memberIds: next }
    })
  }

  const handleRowKeyDown =
    (id?: string | null): React.KeyboardEventHandler<HTMLDivElement> =>
    (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }
      event.preventDefault()
      toggleMember(id)
    }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }

    try {
      setSubmitting(true)
      const created = await createProject({
        name: form.name.trim().slice(0, MAX_PROJECT_TITLE_LENGTH),
        description: form.description?.trim() || undefined,
        status: form.status,
        memberIds: (form.memberIds ?? []).filter((id) => Boolean(id)),
      })
      setForm({ name: '', description: '', status: 'NOT_STARTED', memberIds: [] })
      setSearch('')
      setTeamFilter('')
      onCreated(created)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const authorLabel =
    currentUser?.displayName ?? currentUser?.email ?? currentUser?.username ?? 'You'

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
          <select id="status" name="status" value={form.status} onChange={handleChange}>
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
            value={form.description}
            onChange={handleChange}
            rows={3}
          />
        </div>
        <div className="form-field form-span-2">
          <label htmlFor="assign-search">Assign people</label>
          <p className="muted truncate" title={`Author: ${authorLabel}`}>
            Author: {authorLabel}
          </p>
          <div className="member-filters">
            <input
              id="assign-search"
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
          <div className="member-results">
            {filteredUsers.length === 0 ? (
              <p className="muted">No people match the filters.</p>
            ) : (
              filteredUsers.map((user, index) => {
                const isSelected = user.id ? selectedIds.has(user.id) : false
                const displayName = (user.displayName ?? user.email ?? '-').trim()
                return (
                  <div
                    key={user.id ?? user.email ?? 'user-' + index}
                    className={`member-row${isSelected ? ' highlighted' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleMember(user.id)}
                    onKeyDown={handleRowKeyDown(user.id)}
                    title={user.email ?? displayName}
                  >
                    <div className="member-meta">
                      <strong className="truncate" title={displayName}>
                        {displayName}
                      </strong>
                      <span className="muted truncate" title={user.team ?? ''}>
                        {user.team ?? 'Team'}
                      </span>
                    </div>
                    <span className="muted truncate" title={user.email ?? ''}>
                      {user.email ?? ''}
                    </span>
                    <button
                      type="button"
                      className={isSelected ? 'btn btn-secondary' : 'btn btn-primary'}
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleMember(user.id)
                      }}
                    >
                      {isSelected ? 'Remove' : 'Add'}
                    </button>
                  </div>
                )
              })
            )}
          </div>
          <div className="member-chips" role="list">
            {selectedMembers.length === 0 ? (
              <span className="muted">No people assigned yet.</span>
            ) : (
              selectedMembers.map((member, index) => {
                const label = (member.displayName ?? member.email ?? '-').trim()
                const team = member.team ?? ''
                return (
                  <span
                    key={member.id ?? member.email ?? 'member-' + index}
                    className="chip"
                    role="listitem"
                    title={member.email ?? label}
                  >
                    <strong className="truncate" title={label}>
                      {label}
                    </strong>
                    {team ? (
                      <span className="muted truncate" title={team}>
                        {team}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="chip-remove"
                      aria-label={`Remove ${label}`}
                      onClick={() => toggleMember(member.id)}
                    >
                      x
                    </button>
                  </span>
                )
              })
            )}
          </div>
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  )
}
