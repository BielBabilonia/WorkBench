import { useI18n } from '../../i18n/i18n-context'
import { Skeleton } from '../ui/Skeleton'

/** Shown while a lazy route chunk loads. */
export function PageFallback() {
  const { t } = useI18n()
  return (
    <div role="status" aria-label={t('common.loading')} className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
