import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ReactNode } from 'react'
import type { WorkOrderStatus } from '../../api/schemas'
import { Dot } from '../../components/ui/Badge'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { formatHours } from '../../lib/format'
import { STATUS_TONE } from '../work-orders/tones'
import { columnId } from './column-id'

interface BoardColumnProps {
  status: WorkOrderStatus
  cardIds: string[]
  hours: number
  /** While dragging: whether the card being dragged may land here. */
  dropState: 'idle' | 'allowed' | 'blocked'
  blockedReason?: string
  children: ReactNode
}

export function BoardColumn({ status, cardIds, hours, dropState, blockedReason, children }: BoardColumnProps) {
  const { t, locale } = useI18n()
  const { setNodeRef, isOver } = useDroppable({ id: columnId(status), data: { status } })
  const headingId = `${columnId(status)}-heading`

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex w-72 shrink-0 snap-start flex-col rounded-lg bg-surface-muted/70 transition-opacity lg:w-auto lg:min-w-0 lg:flex-1',
        dropState === 'blocked' && 'opacity-50',
        dropState === 'allowed' && isOver && 'ring-1 ring-border-strong',
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Dot tone={STATUS_TONE[status]} />
        <h2 id={headingId} className="text-[13px] font-medium">
          {t(`status.${status}`)}
        </h2>
        <span className="text-xs text-muted tabular-nums">{cardIds.length}</span>
        <span className="ml-auto text-xs text-subtle tabular-nums" title={t('board.hoursHint')}>
          {formatHours(hours, locale)}
        </span>
      </header>
      {dropState === 'blocked' && blockedReason && <p className="mx-3 mb-2 text-xs text-muted">{blockedReason}</p>}
      <SortableContext id={columnId(status)} items={cardIds} strategy={verticalListSortingStrategy}>
        <ol ref={setNodeRef} className="flex min-h-24 flex-1 flex-col gap-1.5 px-1.5 pb-1.5">
          {children}
          {cardIds.length === 0 && <li className="px-2 py-3 text-xs text-subtle">{t('board.emptyColumn')}</li>}
        </ol>
      </SortableContext>
    </section>
  )
}
