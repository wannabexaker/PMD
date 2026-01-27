import { useEffect, useMemo, useRef, useState } from 'react'
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
  actions?: React.ReactNode
  filterSections?: { label: string; options: { id: string; label: string }[] }[]
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
  actions,
  filterSections,
}: ControlsBarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)

  const isSearchActive = useMemo(() => searchValue.trim().length > 0, [searchValue])

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
  }, [searchOpen])

  useEffect(() => {
    if (!searchOpen) {
      setSearchVisible(false)
    } else {
      setSearchVisible(true)
    }
  }, [searchOpen])

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const requestClose = () => {
    setSearchVisible(false)
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = window.setTimeout(() => setSearchOpen(false), 180)
  }

  return (
    <div className="controls-bar" ref={rootRef}>
      <button
        type="button"
        className="btn btn-icon btn-ghost search-button"
        aria-label={searchAriaLabel}
        title={searchAriaLabel}
        data-tooltip={searchAriaLabel}
        onClick={() => {
          if (searchOpen) {
            requestClose()
            return
          }
          setSearchOpen(true)
        }}
        data-active={isSearchActive ? 'true' : 'false'}
      >
        <SearchIcon />
      </button>
      {searchOpen ? (
        searchOverlay ? (
          <div className="controls-search-popover" data-state={searchVisible ? 'open' : 'closed'}>
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
      <FilterMenu
        ariaLabel={filterAriaLabel}
        options={filters.map((filter) => ({ id: filter.key, label: filter.label }))}
        sections={filterSections}
        selected={selectedFilterKeys}
        onChange={onSelectedFilterKeysChange}
      />
      {actions ? <div className="controls-actions">{actions}</div> : null}
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
