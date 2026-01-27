import { useState } from 'react'
import type { CreateProjectPayload, Project, UserSummary } from '../types'
import { ProjectEditor } from './ProjectEditor'

function formatDate(value?: string | null) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString()
}

type ProjectListProps = {
  projects: Project[]
  users: UserSummary[]
  onCreate: (payload: CreateProjectPayload) => Promise<void>
  onUpdate: (id: string, payload: CreateProjectPayload) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onSelect: (id: string) => void
  selectedId: string | null
}

const MAX_PROJECT_TITLE_LENGTH = 32

function formatProjectTitle(value?: string | null) {
  if (!value) return '-'
  return value.length > MAX_PROJECT_TITLE_LENGTH
    ? value.slice(0, MAX_PROJECT_TITLE_LENGTH) + '…'
    : value
}

export function ProjectList({
  projects,
  users,
  onCreate,
  onUpdate,
  onDelete,
  onSelect,
  selectedId,
}: ProjectListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const usersById = new Map(users.filter((u) => u.id).map((u) => [u.id as string, u]))

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Delete this project?')
    if (!confirmed) return
    await onDelete(id)
  }

  return (
    <section className="panel">
      <h2>Projects</h2>
      <ProjectEditor users={users} onSave={onCreate} submitLabel="Create Project" />
      <ul className="list">
        {projects.length === 0 ? <li className="muted">No projects yet.</li> : null}
        {projects.map((project) => {
          const id = project.id ?? ''
          const isEditing = editingId === id
          return (
            <li key={id || project.name || Math.random()} className="card">
              <div className="row space">
                <div>
                  <strong className="truncate" title={project.name ?? ''}>
                    {formatProjectTitle(project.name)}
                  </strong>
                  <div className="muted truncate" title={project.description ?? ''}>
                    {project.description ?? ''}
                  </div>
                  <div className="meta">
                    <span>{(project.status ?? 'NOT_STARTED').toString().replace('_', ' ')}</span>
                    <span>{formatDate(project.createdAt)}</span>
                    <span>Members: {(project.memberIds ?? []).length}</span>
                  </div>
                  {(project.memberIds ?? []).length > 0 ? (
                    <div className="assigned-list">
                      <span className="muted">Assigned to:</span>
                      <ul>
                        {(project.memberIds ?? []).map((memberId) => {
                          const user = usersById.get(memberId)
                          return (
                            <li key={memberId}>
                              <span className="truncate" title={user?.displayName ?? 'Unknown user'}>
                                {user ? user.displayName ?? 'Unknown user' : 'Unknown user'}
                              </span>
                              <span className="muted truncate" title={user?.email ?? ''}>
                                {user?.email ?? ''}
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <div className="actions">
                  <button type="button" className="btn btn-secondary" onClick={() => onSelect(id)}>
                    {selectedId === id ? 'Hide Details' : 'Details'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingId(isEditing ? null : id)}>
                    {isEditing ? 'Close' : 'Edit'}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(id)}>
                    Delete
                  </button>
                </div>
              </div>
              {isEditing ? (
                <ProjectEditor
                  users={users}
                  initial={project}
                  onSave={async (payload) => {
                    await onUpdate(id, payload)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                  submitLabel="Save Changes"
                />
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
