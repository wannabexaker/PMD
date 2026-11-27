import { loadUiPreferences, type UiPreferences } from '../ui/uiPreferences'

export type DateTimeFormatPreference = UiPreferences['dateTimeFormat']

export type FormatDateTimeOptions = {
  /** Overrides the user's stored preference (Settings > Preferences > Date/time). */
  format?: DateTimeFormatPreference
  /** Include seconds in the time part. */
  withSeconds?: boolean
  /** BCP 47 locale; defaults to the browser locale. */
  locale?: string
}

/** The user's stored 12h/24h preference. Read at call time, so a change in Settings applies on the next render. */
export function getDateTimeFormatPreference(): DateTimeFormatPreference {
  return loadUiPreferences().dateTimeFormat
}

/**
 * Formats a timestamp as date + time, honouring the user's 12h/24h preference.
 * Returns '' for empty or invalid input, so it can be rendered directly.
 */
export function formatDateTime(
  value: string | number | Date | null | undefined,
  options: FormatDateTimeOptions = {}
): string {
  if (value === null || value === undefined || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const format = options.format ?? getDateTimeFormatPreference()
  return date.toLocaleString(options.locale, {
    dateStyle: 'medium',
    timeStyle: options.withSeconds ? 'medium' : 'short',
    // hourCycle rather than hour12: with hour12=false some locales render midnight as "24:00".
    hourCycle: format === '12h' ? 'h12' : 'h23',
  })
}
