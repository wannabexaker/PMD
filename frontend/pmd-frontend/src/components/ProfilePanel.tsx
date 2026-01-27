import { useMemo, useState } from 'react'
import type { UpdateProfilePayload, User } from '../types'
import { updateProfile } from '../api/auth'

type ProfilePanelProps = {
  user: User
  onSaved: (user: User) => void
  onClose: () => void
}

export function ProfilePanel({ user, onSaved, onClose }: ProfilePanelProps) {
  const [form, setForm] = useState<UpdateProfilePayload>({
    email: user.email ?? user.username ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    team: user.team ?? 'Web Developer Team',
    bio: user.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = useMemo(() => {
    const initialEmail = user.email ?? user.username ?? ''
    const initialFirstName = user.firstName ?? ''
    const initialLastName = user.lastName ?? ''
    const initialTeam = user.team ?? 'Web Developer Team'
    const initialBio = user.bio ?? ''
    return (
      form.email !== initialEmail ||
      form.firstName !== initialFirstName ||
      form.lastName !== initialLastName ||
      form.team !== initialTeam ||
      (form.bio ?? '') !== initialBio
    )
  }, [form, user])

  const handleChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = (
    event
  ) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault()
    setError(null)

    if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) {
      setError('Email, name, and surname are required.')
      return
    }

    if ((form.bio ?? '').length > 256) {
      setError('Bio must be 256 characters or less.')
      return
    }

    try {
      setSaving(true)
      const updated = await updateProfile({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        team: form.team.trim(),
        bio: form.bio?.trim() || '',
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-panel">
      <div className="panel-header">
        <h3>My Profile</h3>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="form-grid two-col">
          <div className="form-field form-span-2">
            <label htmlFor="profileEmail">Email</label>
            <input id="profileEmail" name="email" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label htmlFor="profileFirstName">Name</label>
            <input id="profileFirstName" name="firstName" value={form.firstName} onChange={handleChange} />
          </div>
          <div className="form-field">
            <label htmlFor="profileLastName">Surname</label>
            <input id="profileLastName" name="lastName" value={form.lastName} onChange={handleChange} />
          </div>
          <div className="form-field form-span-2">
            <label htmlFor="profileTeam">Team</label>
            <select id="profileTeam" name="team" value={form.team} onChange={handleChange}>
              <option value="Web Developer Team">Web Developer Team</option>
              <option value="DevOps">DevOps</option>
              <option value="Project Manager">Project Manager</option>
            </select>
          </div>
          <div className="form-field form-span-2">
            <label htmlFor="profileBio">Bio</label>
          <textarea
            id="profileBio"
            name="bio"
            value={form.bio ?? ''}
            onChange={handleChange}
            rows={3}
            maxLength={256}
          />
          <span className="muted">{(form.bio ?? '').length}/256</span>
          </div>
        </div>
        {error ? <p className="error">{error}</p> : null}
        <div className="form-actions">
          {!isDirty && !saving ? <p className="muted">No changes to save.</p> : null}
          <div className="actions-right">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !isDirty}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
