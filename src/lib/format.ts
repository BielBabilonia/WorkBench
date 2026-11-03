const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** "12 seconds ago", "in 3 minutes", localized. */
export function formatRelativeTime(date: string | number, locale: string, now = Date.now()): string {
  const diff = (typeof date === 'string' ? Date.parse(date) : date) - now
  const abs = Math.abs(diff)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (abs < 10 * SECOND) return rtf.format(0, 'second')
  if (abs < MINUTE) return rtf.format(Math.round(diff / SECOND), 'second')
  if (abs < HOUR) return rtf.format(Math.round(diff / MINUTE), 'minute')
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour')
  return rtf.format(Math.round(diff / DAY), 'day')
}

export function formatDateTime(date: string | number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date))
}

/** Parses "YYYY-MM-DD" as a local calendar date (not UTC midnight, which shifts a day west of UTC). */
export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Nov 3" this year, "Nov 3, 2025" otherwise. */
export function formatDate(isoDate: string, locale: string, now = new Date()): string {
  const date = parseIsoDate(isoDate)
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  }).format(date)
}

export function formatHours(hours: number, locale: string): string {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours)} h`
}

export function formatPercent(value: number | null, locale: string): string {
  if (value === null) return '—'
  return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(value / 100)
}

/** "AS" for "Ana Souza". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}
