import { useEffect, useRef, useState } from 'react'

/**
 * The "Beta" badge in the topbar. The beta notice lives here only: it opens on hover and
 * on click (click keeps it open until a click outside or Escape), so it is never a banner
 * inside the forms.
 */
export function BetaBadge() {
  const [pinned, setPinned] = useState(false)
  const rootRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!pinned) return
    const close = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setPinned(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPinned(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  return (
    <span ref={rootRef} className={`beta-badge-wrap${pinned ? ' is-open' : ''}`}>
      <button
        type="button"
        className="beta-badge"
        aria-expanded={pinned}
        aria-describedby="beta-badge-note"
        onClick={() => setPinned((open) => !open)}
      >
        Beta
      </button>
      <span id="beta-badge-note" role="tooltip" className="beta-badge-note">
        PMD is in <strong>beta</strong>. Expect rough edges — and there are <strong>no backups</strong>:
        don&apos;t keep anything here you can&apos;t afford to lose.
      </span>
    </span>
  )
}
