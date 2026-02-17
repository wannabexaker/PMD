type PieSlice = {
  label: string
  value: number
  color: string
}

type PieChartProps = {
  data: PieSlice[]
  emptyLabel?: string
}

export function PieChart({ data, emptyLabel = 'No data yet.' }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  if (total === 0) {
    return <p className="muted">{emptyLabel}</p>
  }
  const radius = 56
  const size = 156
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const dashValues = data.map((slice) => (slice.value / total) * circumference)
  const cumulative = dashValues.reduce<number[]>((acc, dash, index) => {
    const previous = index === 0 ? 0 : acc[index - 1]
    acc.push(previous + dash)
    return acc
  }, [])

  return (
    <div className="pie-chart">
      <div className="pie-chart-visual">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} stroke="var(--border)" strokeWidth="16" fill="none" />
        {data.map((slice, index) => {
          if (slice.value === 0) return null
          const dash = dashValues[index]
          const dashArray = `${dash} ${circumference - dash}`
          const previous = index === 0 ? 0 : cumulative[index - 1]
          const dashOffset = circumference - previous
          return (
            <circle
              key={`${slice.label}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              stroke={slice.color}
              strokeWidth="16"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${center} ${center})`}
            />
          )
        })}
      </svg>
      <div className="pie-chart-total">
        <strong>{total}</strong>
        <span className="muted">total</span>
      </div>
      </div>
      <div className="pie-legend">
        {data.map((slice) => (
          <div key={slice.label} className="legend-item">
            <span className="legend-dot" style={{ background: slice.color }} />
            <span className="truncate" title={slice.label}>
              {slice.label}
            </span>
            <span className="muted">
              {slice.value} ({Math.round((slice.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

