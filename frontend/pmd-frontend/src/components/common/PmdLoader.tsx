type PmdLoaderProps = {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'inline' | 'panel' | 'fullscreen'
  label?: string
}

const SIZE_MAP: Record<NonNullable<PmdLoaderProps['size']>, number> = {
  sm: 28,
  md: 44,
  lg: 64,
}

export function PmdLoader({ size = 'md', variant = 'panel', label }: PmdLoaderProps) {
  const dimension = SIZE_MAP[size]
  const showLabel = typeof label === 'string' ? label : size !== 'sm' ? 'Loading...' : ''

  return (
    <div className={`pmd-loader ${variant}`} role="status" aria-busy="true" aria-live="polite">
      <div className="pmd-loader-mark" style={{ width: dimension, height: dimension }}>
        <svg
          width={dimension}
          height={dimension}
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="pmd-loader-logo"
        >
          <rect x="6" y="8" width="26" height="10" rx="4" className="logo-panel" />
          <rect x="10" y="20" width="26" height="10" rx="4" className="logo-panel" />
          <rect x="14" y="32" width="26" height="10" rx="4" className="logo-panel" />
          <circle cx="38" cy="13" r="5" className="logo-node" />
          <circle cx="42" cy="25" r="5" className="logo-node" />
          <circle cx="36" cy="37" r="5" className="logo-node" />
        </svg>
        <svg
          className="pmd-loader-ring"
          viewBox="0 0 64 64"
          width={dimension}
          height={dimension}
          aria-hidden="true"
        >
          <circle cx="32" cy="32" r="26" />
        </svg>
      </div>
      {showLabel ? <span className="pmd-loader-label">{showLabel}</span> : null}
    </div>
  )
}
