import { useEffect, useMemo, useState } from 'react'
import type { DashboardStatsResponse, UpdateProfilePayload, User, UserStatsResponse } from '../types'
import { updateProfile } from '../api/auth'
import { useTeams } from '../teams/TeamsContext'
import { fetchMyUserStats } from '../api/stats'
import { fetchMyDashboardStats } from '../api/projects'
import { useWorkspace } from '../workspaces/WorkspaceContext'

type ProfilePanelProps = {
  user: User
  onSaved: (user: User) => void
  onClose: () => void
}

export function ProfilePanel({ user, onSaved, onClose }: ProfilePanelProps) {
  const { teams, loading: teamsLoading } = useTeams()
  const { activeWorkspaceId } = useWorkspace()
  const [form, setForm] = useState<UpdateProfilePayload>({
    email: user.email ?? user.username ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    teamId: user.teamId ?? '',
    bio: user.bio ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [myStats, setMyStats] = useState<UserStatsResponse | null>(null)
  const [myStatsError, setMyStatsError] = useState<string | null>(null)
  const [myDashboardStats, setMyDashboardStats] = useState<DashboardStatsResponse | null>(null)
  const [myDashboardError, setMyDashboardError] = useState<string | null>(null)

  const isDirty = useMemo(() => {
    const initialEmail = user.email ?? user.username ?? ''
    const initialFirstName = user.firstName ?? ''
    const initialLastName = user.lastName ?? ''
    const initialTeam = user.teamId ?? ''
    const initialBio = user.bio ?? ''
    return (
      form.email !== initialEmail ||
      form.firstName !== initialFirstName ||
      form.lastName !== initialLastName ||
      form.teamId !== initialTeam ||
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
      if (!form.teamId) {
        setError('Please select a team.')
        return
      }

      const updated = await updateProfile({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        teamId: form.teamId,
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

  useEffect(() => {
    let active = true
    setMyStatsError(null)
    if (!activeWorkspaceId) {
      setMyStats(null)
      return () => {
        active = false
      }
    }
    fetchMyUserStats(activeWorkspaceId)
      .then((data) => {
        if (active) setMyStats(data)
      })
      .catch((err) => {
        if (active) setMyStatsError(err instanceof Error ? err.message : 'Failed to load my stats')
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

  useEffect(() => {
    let active = true
    setMyDashboardError(null)
    if (!activeWorkspaceId) {
      setMyDashboardStats(null)
      return () => {
        active = false
      }
    }
    fetchMyDashboardStats(activeWorkspaceId)
      .then((data) => {
        if (active) setMyDashboardStats(data)
      })
      .catch((err) => {
        if (active) setMyDashboardError(err instanceof Error ? err.message : 'Failed to load dashboard stats')
      })
    return () => {
      active = false
    }
  }, [activeWorkspaceId])

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
            <select
              id="profileTeam"
              name="teamId"
              value={form.teamId ?? ''}
              onChange={handleChange}
              disabled={teamsLoading && teams.length === 0}
            >
              <option value="">{teamsLoading ? 'Loading teams...' : 'Select team'}</option>
              {teams.map((team) => (
                <option key={team.id ?? team.name} value={team.id ?? ''}>
                  {team.name}
                </option>
              ))}
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
      <div className="card">
        <div className="panel-header">
          <h4>My stats</h4>
        </div>
        {myStatsError ? <p className="error">{myStatsError}</p> : null}
        {!myStats ? (
          <p className="muted">Loading stats...</p>
        ) : (
          <div className="stats-strip">
            {(myStats.statusBreakdown ?? []).map((slice) => (
              <div key={slice.label} className="stat">
                <span className="muted">{slice.label}</span>
                <strong>{slice.value}</strong>
              </div>
            ))}
            {(myStats.activeInactiveBreakdown ?? []).map((slice) => (
              <div key={`ai-${slice.label}`} className="stat">
                <span className="muted">{slice.label}</span>
                <strong>{slice.value}</strong>
              </div>
            ))}
            {myStats.teamAverages ? (
              <div className="stat">
                <span className="muted">Team avg active</span>
                <strong>{myStats.teamAverages.activeProjects.toFixed(1)}</strong>
              </div>
            ) : null}
          </div>
        )}
      </div>
      <div className="card">
        <div className="panel-header">
          <h4>My dashboard stats</h4>
        </div>
        {myDashboardError ? <p className="error">{myDashboardError}</p> : null}
        {!myDashboardStats ? (
          <p className="muted">Loading dashboard stats...</p>
        ) : (
          <div className="stats-strip">
            {(myDashboardStats.statusBreakdown ?? []).map((slice) => (
              <div key={`my-${slice.label}`} className="stat">
                <span className="muted">{slice.label}</span>
                <strong>{slice.value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
