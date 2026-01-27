import { useState } from 'react'
import {
  createProject,
  type CreateProjectPayload,
  type ProjectStatus,
} from '../api/projects'

type CreateProjectFormProps = {
  onCreated: () => void
}

const MAX_PROJECT_TITLE_LENGTH = 32

export function CreateProjectForm({ onCreated }: CreateProjectFormProps) {
  const [form, setForm] = useState<CreateProjectPayload>({
    name: '',
    description: '',
    status: 'NOT_STARTED',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
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
      await createProject({
        name: form.name.trim().slice(0, MAX_PROJECT_TITLE_LENGTH),
        description: form.description?.trim() || undefined,
        status: form.status,
      })
      setForm({ name: '', description: '', status: 'NOT_STARTED' })
      onCreated()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project'
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
          <select id="status" name="status" value={form.status} onChange={handleChange}>
            {(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED'] as ProjectStatus[]).map(
              (status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              )
            )}
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
      </div>
      {error ? <p className="form-error">{error}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Project'}
      </button>
    </form>
  )
}
