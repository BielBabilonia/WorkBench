import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KeyboardEventHandler, MouseEventHandler, TouchEventHandler } from 'react'
import { Link } from 'react-router-dom'
import type { Asset, User, WorkOrder } from '../../api/schemas'
import { Avatar } from '../../components/ui/Avatar'
import { GripIcon } from '../../components/ui/icons'
import { useI18n } from '../../i18n/i18n-context'
import { cn } from '../../lib/cn'
import { formatDate } from '../../lib/format'
import { checklistProgress, isOverdue } from '../../lib/workflow'
import { PriorityBadge } from '../work-orders/badges'

interface CardContentProps {
  workOrder: WorkOrder
  asset: Asset | undefined
  assignee: User | undefined
}

/** What a card shows; shared by the board and the drag overlay. */
export function CardContent({ workOrder, asset, assignee }: CardContentProps) {
  const { t, locale } = useI18n()
  const progress = checklistProgress(workOrder)
  const overdue = isOverdue(workOrder)
  const urgent = workOrder.priority === 'high' || workOrder.priority === 'critical'
  return (
    <>
      <h3 className="text-[13px] leading-snug font-medium text-fg">
        <Link
          to={`/work-orders/${workOrder.id}`}
          className="rounded-sm after:absolute after:inset-0 focus-visible:outline-offset-1"
        >
          {workOrder.title}
        </Link>
      </h3>
      <p className="mt-0.5 truncate text-xs text-muted">
        <span className="font-mono">{workOrder.code}</span>
        {asset && <> · {asset.tag}</>}
      </p>
      <div className="mt-2.5 flex items-center gap-2.5 text-xs text-muted">
        {urgent && <PriorityBadge priority={workOrder.priority} />}
        <span className={cn(overdue && 'text-danger-fg')}>
          {formatDate(workOrder.dueDate, locale)}
          {overdue && <span className="sr-only"> ({t('common.overdue')})</span>}
        </span>
        {progress.total > 0 && (
          <span className={cn('tabular-nums', progress.done === progress.total && 'text-success-fg')}>
            {progress.done}/{progress.total}
            <span className="sr-only"> {t('board.checklistProgress')}</span>
          </span>
        )}
        <span className="ml-auto">
          <Avatar user={assignee} size="sm" />
          <span className="sr-only">{assignee ? assignee.name : t('common.unassigned')}</span>
        </span>
      </div>
    </>
  )
}

interface SensorListeners {
  onMouseDown?: MouseEventHandler
  onTouchStart?: TouchEventHandler
  onKeyDown?: KeyboardEventHandler
}

interface BoardCardProps extends CardContentProps {
  draggable: boolean
}

export function BoardCard({ workOrder, asset, assignee, draggable }: BoardCardProps) {
  const { t } = useI18n()
  const { attributes, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, ...sortable } = useSortable({
    id: workOrder.id,
    data: { status: workOrder.status },
    disabled: { draggable: !draggable, droppable: false },
  })
  // dnd-kit types its listeners as plain `Function`s.
  const listeners = sortable.listeners as SensorListeners | undefined

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // Mouse and touch drag from anywhere on the card; keyboard drag from the handle,
      // so Enter on the title still opens the work order.
      onMouseDown={listeners?.onMouseDown}
      onTouchStart={listeners?.onTouchStart}
      className={cn(
        'relative rounded-md border border-border bg-surface px-3 py-2.5 hover:border-border-strong',
        draggable && 'cursor-grab touch-manipulation',
        isDragging && 'opacity-40',
      )}
    >
      {draggable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          onKeyDown={listeners?.onKeyDown}
          aria-label={t('board.dragHandle', { code: workOrder.code })}
          // Only shown to keyboard users: with a mouse, the whole card drags.
          className="absolute top-1.5 right-1.5 z-10 rounded-sm bg-surface p-0.5 text-muted opacity-0 focus-visible:opacity-100"
        >
          <GripIcon className="size-4" />
        </button>
      )}
      <CardContent workOrder={workOrder} asset={asset} assignee={assignee} />
    </li>
  )
}
