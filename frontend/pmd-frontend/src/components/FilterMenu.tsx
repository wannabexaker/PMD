import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type FilterOption = {
  id: string
  label: string
}

type FilterMenuProps = {
  options?: FilterOption[]
  sections?: { label: string; options: FilterOption[] }[]
  selected: string[]
  onChange: (next: string[]) => void
  ariaLabel: string
  isActive?: boolean
  extraContent?: React.ReactNode
  icon?: ReactNode
  buttonClassName?: string
}

export function FilterMenu({
  options = [],
  sections,
  selected,
  onChange,
  ariaLabel,
  isActive,
  extraContent,
  icon,
  buttonClassName,
}: FilterMenuProps) {
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const popoverRef = useRef<HTMLDivElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const allOptions = useMemo(() => {
    if (sections && sections.length > 0) {
      return sections.flatMap((section) => section.options)
    }
    return options
  }, [options, sections])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const derivedActive = selected.length > 0 && selected.length < allOptions.length
  const active = isActive ?? derivedActive
  const allChecked = allOptions.length > 0 && selected.length === allOptions.length
  const noneChecked = selected.length === 0

  const requestClose = useCallback(() => {
    setVisible(false)
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 200)
  }, [])

  useEffect(() => {
    if (!open) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (rootRef.current?.contains(target) || popoverRef.current?.contains(target))) {
        return
      }
      requestClose()
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }
    window.addEventListener('click', handleClick)
    window.addEventListener('keydown', handleKey)
    requestAnimationFrame(() => {
      const first = popoverRef.current?.querySelector<HTMLElement>('button, [role="menuitemcheckbox"]')
      first?.focus()
    })
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open, requestClose])

  useLayoutEffect(() => {
    if (!open || !visible) return
    const root = rootRef.current
    const popover = popoverRef.current
    if (!root || !popover) return
    const margin = 8
    const spacing = 8
    const triggerRect = root.getBoundingClientRect()
    const popoverRect = popover.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = triggerRect.right - popoverRect.width
    left = Math.max(margin, Math.min(left, viewportWidth - popoverRect.width - margin))

    let top = triggerRect.bottom + spacing
    let openAbove = false
    if (top + popoverRect.height > viewportHeight - margin) {
      const aboveTop = triggerRect.top - popoverRect.height - spacing
      if (aboveTop >= margin) {
        top = aboveTop
        openAbove = true
      } else {
        top = margin
      }
    }

    const availableHeight = openAbove
      ? Math.max(140, triggerRect.top - margin - spacing)
      : Math.max(140, viewportHeight - top - margin)

    setPopoverStyle({
      position: 'fixed',
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      ['--filter-popover-max-height' as string]: `${Math.round(availableHeight)}px`,
    })
  }, [open, visible])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const toggleOption = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((value) => value !== id))
      return
    }
    onChange([...selected, id])
  }

  return (
    <div className="filter-menu" ref={rootRef}>
      <button
        type="button"
        className={`btn btn-icon btn-ghost icon-toggle filter-button${buttonClassName ? ' ' + buttonClassName : ''}`}
        aria-label={ariaLabel}
        title={ariaLabel}
        data-tooltip={ariaLabel}
        onClick={() => {
          if (open) {
            requestClose()
            return
          }
          setVisible(true)
          setOpen(true)
        }}
        data-active={active ? 'true' : 'false'}
      >
        {icon ?? <FilterIcon />}
      </button>
      {open ? (
        <div
          className="filter-popover"
          role="menu"
          aria-label={ariaLabel}
          ref={popoverRef}
          data-state={visible ? 'open' : 'closed'}
          style={popoverStyle}
        >
          {extraContent ? <div className="filter-extra">{extraContent}</div> : null}
          <div className="filter-actions" role="group" aria-label="Bulk filter actions">
            <button
              type="button"
              className="btn btn-secondary filter-action-btn"
              onClick={() => onChange(allOptions.map((o) => o.id))}
              disabled={allChecked}
              title="Check all filters"
            >
              All
            </button>
            <button
              type="button"
              className="btn btn-secondary filter-action-btn"
              onClick={() => onChange([])}
              disabled={noneChecked}
              title="Uncheck all filters"
            >
              None
            </button>
          </div>
          <div className="filter-options">
            {(sections && sections.length > 0 ? sections : [{ label: '', options }]).map((section) => (
              <div key={section.label || 'default'} className="filter-section">
                {section.label ? <div className="filter-section-title">{section.label}</div> : null}
                {section.options.map((option) => {
                  const checked = selectedSet.has(option.id)
                  return (
                    <div
                      key={option.id}
                      className={`filter-option${checked ? ' is-checked' : ''}`}
                      role="menuitemcheckbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onClick={() => toggleOption(option.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          toggleOption(option.id)
                        }
                      }}
                    >
                      <input type="checkbox" checked={checked} readOnly tabIndex={-1} />
                      <span className="truncate" title={option.label}>
                        {option.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
