import type { AssetState, Priority, WorkOrderStatus, WorkType } from '../../api/schemas'
import { Dot } from '../../components/ui/Badge'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { ASSET_STATE_TONE, STATUS_TONE } from './tones'

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  const { t } = useI18n()
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap text-fg">
      <Dot tone={STATUS_TONE[status]} />
      {t(`status.${status}`)}
    </span>
  )
}

/** Only high and critical get color: everything else is ordinary. */
export function PriorityBadge({ priority }: { priority: Priority }) {
  const { t } = useI18n()
  return (
    <span
      className={cn(
        'text-[13px] whitespace-nowrap',
        priority === 'critical' && 'font-medium text-danger-fg',
        priority === 'high' && 'text-warning-fg',
        (priority === 'medium' || priority === 'low') && 'text-muted',
      )}
    >
      {t(`priority.${priority}`)}
    </span>
  )
}

export function AssetStateBadge({ state }: { state: AssetState }) {
  const { t } = useI18n()
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] whitespace-nowrap">
      <Dot tone={ASSET_STATE_TONE[state]} />
      {t(`assetState.${state}`)}
    </span>
  )
}

export function TypeLabel({ type }: { type: WorkType }) {
  const { t } = useI18n()
  return <span className="text-xs text-muted">{t(`type.${type}`)}</span>
}
