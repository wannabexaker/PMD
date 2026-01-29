import type { Team } from '../../types'

type TeamFilterSelectProps = {
  value: string
  teams: Team[]
  onChange: (value: string) => void
  allLabel?: string
  disabled?: boolean
  ariaLabel?: string
}

export function TeamFilterSelect({
  value,
  teams,
  onChange,
  allLabel = 'All teams',
  disabled,
  ariaLabel = 'Filter by team',
}: TeamFilterSelectProps) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <option value="">{allLabel}</option>
      {teams.map((team) => (
        <option key={team.id ?? team.name} value={team.id ?? ''}>
          {team.name}
        </option>
      ))}
    </select>
  )
}
