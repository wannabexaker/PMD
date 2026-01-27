type ThemeToggleProps = {
  theme: 'dark' | 'light'
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const isLight = theme === 'light'
  return (
    <button
      type="button"
      className={`lamp-toggle ${isLight ? 'lamp-on' : 'lamp-off'}`}
      onClick={onToggle}
      aria-label="Toggle theme"
    >
      <span className="lamp-track">
        <span className="lamp-bulb" aria-hidden>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="lamp-icon">
            <path
              d="M12 3.5c-3.04 0-5.5 2.4-5.5 5.38 0 1.96 1.05 3.55 2.29 4.63.7.61 1.21 1.59 1.32 2.49h3.78c.11-.9.62-1.88 1.32-2.49 1.24-1.08 2.29-2.67 2.29-4.63C17.5 5.9 15.04 3.5 12 3.5Z"
            />
            <path d="M9.5 18h5l-.4 1.8a2 2 0 0 1-1.96 1.5h-.28a2 2 0 0 1-1.96-1.5L9.5 18Z" />
          </svg>
        </span>
      </span>
    </button>
  )
}
