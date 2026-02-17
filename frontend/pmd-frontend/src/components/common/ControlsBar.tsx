import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { FilterMenu } from '../FilterMenu'

type ControlsBarProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters: { key: string; label: string }[]
  selectedFilterKeys: string[]
  onSelectedFilterKeysChange: (keys: string[]) => void
  searchAriaLabel?: string
  filterAriaLabel?: string
  searchOverlay?: boolean
  filterBeforeSearch?: boolean
  leadingActions?: React.ReactNode
  actions?: React.ReactNode
  trailingActions?: React.ReactNode
  filterSections?: { label: string; options: { id: string; label: string }[] }[]
  filterActive?: boolean
  filterExtra?: React.ReactNode
}

export function ControlsBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  filters,
  selectedFilterKeys,
  onSelectedFilterKeysChange,
  searchAriaLabel = 'Search',
  filterAriaLabel = 'Filter',
  searchOverlay = false,
  filterBeforeSearch = false,
  leadingActions,
  actions,
  trailingActions,
  filterSections,
  filterActive,
  filterExtra,
}: ControlsBarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchPopoverStyle, setSearchPopoverStyle] = useState<CSSProperties | undefined>(undefined)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const isSearchActive = useMemo(() => searchValue.trim().length > 0, [searchValue])

  const requestClose = useCallback(() => {
    setSearchVisible(false)
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => setSearchOpen(false), 180)
  }, [])

  useEffect(() => {
    if (!searchVisible) return
    inputRef.current?.focus()
  }, [searchVisible])

  useEffect(() => {
    if (!searchOpen) return
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && rootRef.current?.contains(target)) {
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
    return () => {
      window.removeEventListener('click', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [searchOpen, requestClose])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  useLayoutEffect(() => {
    if (!searchOverlay || !searchOpen || !searchVisible) {
      return
    }
    const updatePopoverPosition = () => {
      const root = rootRef.current
      if (!root) {
        return
      }
      const button = root.querySelector('.search-button') as HTMLElement | null
      const popover = root.querySelector('.controls-search-popover') as HTMLElement | null
      if (!button || !popover) {
        return
      }
      const margin = 8
      const spacing = 8
      const triggerRect = button.getBoundingClientRect()
      const popoverRect = popover.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = triggerRect.left
      if (left + popoverRect.width > viewportWidth - margin) {
        left = viewportWidth - popoverRect.width - margin
      }
      left = Math.max(margin, left)

      let top = triggerRect.bottom + spacing
      if (top + popoverRect.height > viewportHeight - margin) {
        const aboveTop = triggerRect.top - popoverRect.height - spacing
        top = aboveTop >= margin ? aboveTop : Math.max(margin, viewportHeight - popoverRect.height - margin)
      }

      setSearchPopoverStyle({
        position: 'fixed',
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
      })
    }

    updatePopoverPosition()
    window.addEventListener('resize', updatePopoverPosition)
    window.addEventListener('scroll', updatePopoverPosition, true)
    return () => {
      window.removeEventListener('resize', updatePopoverPosition)
      window.removeEventListener('scroll', updatePopoverPosition, true)
    }
  }, [searchOverlay, searchOpen, searchVisible])

  const resolvedTrailingActions = trailingActions ?? actions

  return (
    <div className="controls-bar" ref={rootRef}>
      {leadingActions ? <div className="controls-actions">{leadingActions}</div> : null}
      {filterBeforeSearch ? (
        <FilterMenu
          ariaLabel={filterAriaLabel}
          options={filters.map((filter) => ({ id: filter.key, label: filter.label }))}
          sections={filterSections}
          selected={selectedFilterKeys}
          onChange={onSelectedFilterKeysChange}
          isActive={filterActive}
          extraContent={filterExtra}
        />
      ) : null}
      <button
        type="button"
        className="btn btn-icon btn-ghost icon-toggle search-button"
        aria-label={searchAriaLabel}
        title={searchAriaLabel}
        data-tooltip={searchAriaLabel}
        onClick={() => {
          if (searchOpen) {
            requestClose()
            return
          }
          setSearchVisible(true)
          setSearchOpen(true)
        }}
        data-active={isSearchActive ? 'true' : 'false'}
      >
        <SearchIcon />
      </button>
      {searchOpen ? (
        searchOverlay ? (
          <div className="controls-search-popover" data-state={searchVisible ? 'open' : 'closed'} style={searchPopoverStyle}>
            <input
              ref={inputRef}
              type="search"
              className="controls-search"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            type="search"
            className="controls-search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        )
      ) : null}
      {!filterBeforeSearch ? (
        <FilterMenu
          ariaLabel={filterAriaLabel}
          options={filters.map((filter) => ({ id: filter.key, label: filter.label }))}
          sections={filterSections}
          selected={selectedFilterKeys}
          onChange={onSelectedFilterKeysChange}
          isActive={filterActive}
          extraContent={filterExtra}
        />
      ) : null}
      {resolvedTrailingActions ? <div className="controls-actions">{resolvedTrailingActions}</div> : null}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M16.5 16.5 21 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
