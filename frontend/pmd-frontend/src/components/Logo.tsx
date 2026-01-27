type LogoProps = {
  size?: number
  showText?: boolean
}

export function Logo({ size = 28, showText = true }: LogoProps) {
  return (
    <div className="logo">
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        role="img"
        aria-label="PMD logo"
        className="logo-mark"
      >
        <rect x="6" y="8" width="26" height="10" rx="4" className="logo-panel" />
        <rect x="10" y="20" width="26" height="10" rx="4" className="logo-panel" />
        <rect x="14" y="32" width="26" height="10" rx="4" className="logo-panel" />
        <circle cx="38" cy="13" r="5" className="logo-node" />
        <circle cx="42" cy="25" r="5" className="logo-node" />
        <circle cx="36" cy="37" r="5" className="logo-node" />
      </svg>
      {showText ? <span className="logo-text">PMD</span> : null}
    </div>
  )
}
