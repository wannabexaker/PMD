/** Drag-handle grip, replacing a literal "::" rendered as the handle's text. */
export function GripIcon({ size = 14 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" focusable="false">
      <g fill="currentColor">
        <circle cx="6" cy="3" r="1.4" />
        <circle cx="10" cy="3" r="1.4" />
        <circle cx="6" cy="8" r="1.4" />
        <circle cx="10" cy="8" r="1.4" />
        <circle cx="6" cy="13" r="1.4" />
        <circle cx="10" cy="13" r="1.4" />
      </g>
    </svg>
  )
}
