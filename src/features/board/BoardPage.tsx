import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMemo, useState } from 'react'
import { useAssets, useMoveWorkOrder, useUsers, useWorkOrders } from '../../api/queries'
import { STATUSES, type WorkOrder, type WorkOrderStatus } from '../../api/schemas'
import { Button } from '../../components/ui/Button'
import { PlusIcon } from '../../components/ui/icons'
import { PageHeader } from '../../components/ui/PageHeader'
import { Skeleton } from '../../components/ui/Skeleton'
import { ErrorState } from '../../components/ui/States'
import { useToast } from '../../components/ui/toast-context'
import { useI18n } from '../../i18n/i18n-context'
import { useErrorMessage } from '../../i18n/use-error-message'
import { canDrag, canMove } from '../../lib/permissions'
import { useDocumentTitle } from '../../lib/use-document-title'
import { byPosition, moveBlocker, toFullIndex } from '../../lib/workflow'
import { useCurrentUser, useSession } from '../../session/session-context'
import { matchesFilters, useWorkOrderFilters } from '../work-orders/filters'
import { WorkOrderFilters } from '../work-orders/WorkOrderFilters'
import { WorkOrderFormModal } from '../work-orders/WorkOrderFormModal'
import { BoardCard, CardContent } from './BoardCard'
import { BoardColumn } from './BoardColumn'
import { columnId } from './column-id'

type Columns = Record<WorkOrderStatus, string[]>

function groupByStatus(workOrders: readonly WorkOrder[]): Columns {
  const columns = Object.fromEntries(STATUSES.map((s) => [s, [] as string[]])) as Columns
  for (const wo of [...workOrders].sort(byPosition)) columns[wo.status].push(wo.id)
  return columns
}

function columnOf(columns: Columns, id: UniqueIdentifier): WorkOrderStatus | undefined {
  const key = String(id)
  const fromColumnId = STATUSES.find((s) => columnId(s) === key)
  return fromColumnId ?? STATUSES.find((s) => columns[s].includes(key))
}

interface DragState {
  id: string
  origin: WorkOrderStatus
  /** Columns at pick-up, to put the card back when hovering a blocked column. */
  start: Columns
  columns: Columns
}

export function BoardPage() {
  const { t } = useI18n()
  useDocumentTitle(t('nav.board'))
  const user = useCurrentUser()
  const { can } = useSession()
  const toast = useToast()
  const errorMessage = useErrorMessage()
  const workOrders = useWorkOrders()
  const { data: assets = [] } = useAssets()
  const { data: users = [] } = useUsers()
  const move = useMoveWorkOrder()
  const [filters, setFilters] = useWorkOrderFilters()
  const [creating, setCreating] = useState(false)
  const [drag, setDrag] = useState<DragState | null>(null)
  // Columns as dropped, shown until the server confirms so the card doesn't jump back and forth.
  const [settling, setSettling] = useState<Columns | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Long-press on touch, so swiping still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const all = useMemo(() => workOrders.data ?? [], [workOrders.data])
  const byId = useMemo(() => new Map(all.map((wo) => [wo.id, wo])), [all])
  const assetsById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets])
  const usersById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const visible = useMemo(
    () => all.filter((wo) => matchesFilters(wo, filters, user, assetsById.get(wo.assetId))),
    [all, filters, user, assetsById],
  )
  const columns = drag?.columns ?? settling ?? groupByStatus(visible)
  const active = drag ? byId.get(drag.id) : undefined

  /** Whether the dragged card may land in `status`, and why not. */
  function dropRule(status: WorkOrderStatus): { allowed: boolean; reason?: string } {
    if (!active || !drag || status === drag.origin) return { allowed: true }
    if (!canMove(user, active, status)) return { allowed: false, reason: t('board.blocked.permission') }
    const blocker = moveBlocker(active, status)
    if (blocker === 'unassigned') return { allowed: false, reason: t('board.blocked.unassigned') }
    if (blocker === 'checklist_incomplete') return { allowed: false, reason: t('board.blocked.checklist') }
    return { allowed: true }
  }

  /**
   * Moves the card into another column while hovering, if the move is allowed.
   * Over a blocked column it goes back home, so a drop there changes nothing
   * (instead of landing in whatever column it crossed on the way).
   */
  function moveAcross(state: DragState, overId: UniqueIdentifier): Columns {
    const from = columnOf(state.columns, state.id)
    const to = columnOf(state.columns, overId)
    if (!from || !to || from === to) return state.columns
    if (!dropRule(to).allowed) return state.start
    const target = state.columns[to]
    const overIndex = target.indexOf(String(overId))
    const index = overIndex === -1 ? target.length : overIndex
    return {
      ...state.columns,
      [from]: state.columns[from].filter((id) => id !== state.id),
      [to]: [...target.slice(0, index), state.id, ...target.slice(index)],
    }
  }

  function handleDragStart({ active: started }: DragStartEvent) {
    const id = String(started.id)
    const current = groupByStatus(visible)
    const origin = columnOf(current, id)
    if (!origin) return
    setSettling(null)
    setDrag({ id, origin, start: current, columns: current })
  }

  function handleDragOver({ over }: DragOverEvent) {
    if (!drag || !over) return
    const next = moveAcross(drag, over.id)
    if (next !== drag.columns) setDrag({ ...drag, columns: next })
  }

  function handleDragEnd({ over }: DragEndEvent) {
    if (!drag || !active) return setDrag(null)
    let next = over ? moveAcross(drag, over.id) : drag.columns
    const status = columnOf(next, drag.id)!
    // Reordering inside a column.
    if (over && columnOf(next, over.id) === status && String(over.id) !== drag.id) {
      const ids = next[status]
      const overIndex = ids.indexOf(String(over.id))
      if (overIndex !== -1) next = { ...next, [status]: arrayMove(ids, ids.indexOf(drag.id), overIndex) }
    }
    setDrag(null)
    if (status === drag.origin && next[status].indexOf(drag.id) === drag.start[status].indexOf(drag.id)) return

    const fullColumn = groupByStatus(all)[status]
    const index = toFullIndex(fullColumn, next[status], drag.id)
    setSettling(next)
    move.mutate(
      { id: drag.id, move: { status, index } },
      {
        onSuccess: () => {
          if (status !== drag.origin) {
            toast(t('toast.moved', { code: active.code, status: t(`status.${status}`) }))
          }
        },
        onError: (error) => toast(errorMessage(error), 'error'),
        onSettled: () => setSettling(null),
      },
    )
  }

  const codeOf = (id: UniqueIdentifier) => byId.get(String(id))?.code ?? ''
  const placeOf = (id: UniqueIdentifier | undefined) => {
    if (!id) return t('board.sr.nowhere')
    const status = columnOf(drag?.columns ?? columns, id)
    return status ? t(`status.${status}`) : t('board.sr.nowhere')
  }
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => t('board.sr.picked', { code: codeOf(a.id), column: placeOf(a.id) }),
    onDragOver: ({ active: a, over }) => t('board.sr.over', { code: codeOf(a.id), column: placeOf(over?.id) }),
    onDragEnd: ({ active: a, over }) => t('board.sr.dropped', { code: codeOf(a.id), column: placeOf(over?.id) }),
    onDragCancel: ({ active: a }) => t('board.sr.cancelled', { code: codeOf(a.id) }),
  }

  const notice =
    user.role === 'technician' ? t('board.technicianNotice') : user.role === 'viewer' ? t('board.viewerNotice') : null

  return (
    <div>
      <PageHeader
        title={t('board.title')}
        actions={
          can('workOrder.create') && (
            <Button variant="primary" onClick={() => setCreating(true)}>
              <PlusIcon />
              {t('workOrders.new')}
            </Button>
          )
        }
      />

      <WorkOrderFilters filters={filters} onChange={setFilters} users={users} />

      {notice && <p className="mb-3 text-[13px] text-muted">{notice}</p>}

      {workOrders.isError ? (
        <ErrorState onRetry={() => workOrders.refetch()} />
      ) : workOrders.isPending ? (
        <BoardSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDrag(null)}
          accessibility={{
            announcements,
            screenReaderInstructions: { draggable: t('board.sr.instructions') },
          }}
        >
          <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:px-0">
            {STATUSES.map((status) => {
              const rule = dropRule(status)
              const cards = columns[status].flatMap((id) => byId.get(id) ?? [])
              return (
                <BoardColumn
                  key={status}
                  status={status}
                  cardIds={columns[status]}
                  hours={cards.reduce((sum, wo) => sum + wo.estimatedHours, 0)}
                  dropState={!drag ? 'idle' : rule.allowed ? 'allowed' : 'blocked'}
                  blockedReason={rule.reason}
                >
                  {cards.map((wo) => (
                    <BoardCard
                      key={wo.id}
                      // The column it's shown in while dragging, not where the server has it.
                      workOrder={{ ...wo, status }}
                      asset={assetsById.get(wo.assetId)}
                      assignee={wo.assigneeId ? usersById.get(wo.assigneeId) : undefined}
                      draggable={canDrag(user, wo)}
                    />
                  ))}
                </BoardColumn>
              )
            })}
          </div>
          <DragOverlay>
            {active && (
              <div className="relative cursor-grabbing rounded-md border border-border-strong bg-surface px-3 py-2.5 shadow-overlay">
                <CardContent
                  workOrder={active}
                  asset={assetsById.get(active.assetId)}
                  assignee={active.assigneeId ? usersById.get(active.assigneeId) : undefined}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      <WorkOrderFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden" aria-hidden>
      {STATUSES.map((status) => (
        <div key={status} className="w-72 shrink-0 space-y-2 rounded-xl border border-border p-3 lg:flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ))}
    </div>
  )
}
