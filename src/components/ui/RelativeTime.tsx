import { useI18n } from '../../i18n/i18n-context'
import { formatDateTime, formatRelativeTime } from '../../lib/format'
import { useNow } from '../../lib/use-now'

/** "12 minutes ago", ticking on its own so parents don't re-render. */
export function RelativeTime({ date }: { date: string | number }) {
  const { locale } = useI18n()
  const now = useNow(30_000)
  const iso = new Date(date).toISOString()
  return (
    <time dateTime={iso} title={formatDateTime(date, locale)}>
      {formatRelativeTime(date, locale, now)}
    </time>
  )
}
