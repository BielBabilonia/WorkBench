import type { AssetState, WorkOrder, WorkOrderStatus } from '../api/schemas'

/**
 * Work-order rules shared by the mock API and the UI, so the board can refuse
 * a drop before the request and the server refuses it anyway.
 */

export type MoveBlocker = 'unassigned' | 'checklist_incomplete'

/** Why `workOrder` can't go to `status`, or null when it can. Permissions are checked separately. */
export function moveBlocker(
  workOrder: Pick<WorkOrder, 'assigneeId' | 'checklist'>,
  status: WorkOrderStatus,
): MoveBlocker | null {
  if ((status === 'in_progress' || status === 'done') && !workOrder.assigneeId) return 'unassigned'
  if (status === 'done' && workOrder.checklist.some((item) => !item.done)) return 'checklist_incomplete'
  return null
}

export function checklistProgress(workOrder: Pick<WorkOrder, 'checklist'>) {
  const total = workOrder.checklist.length
  const done = workOrder.checklist.filter((item) => item.done).length
  return { done, total }
}

/**
 * Moves a card to `index` of the `status` column and renumbers the columns it
 * touched. Pure: used for the optimistic update and by the mock server.
 */
export function applyMove<T extends Pick<WorkOrder, 'id' | 'status' | 'position'>>(
  workOrders: readonly T[],
  id: string,
  status: WorkOrderStatus,
  index: number,
): T[] {
  const moving = workOrders.find((wo) => wo.id === id)
  if (!moving) return [...workOrders]

  const column = workOrders
    .filter((wo) => wo.status === status && wo.id !== id)
    .sort(byPosition)
  column.splice(Math.min(index, column.length), 0, { ...moving, status })

  const positions = new Map(column.map((wo, i) => [wo.id, i]))
  const source = workOrders
    .filter((wo) => wo.status === moving.status && wo.id !== id)
    .sort(byPosition)
  if (moving.status !== status) source.forEach((wo, i) => positions.set(wo.id, i))

  return workOrders.map((wo) => {
    const position = positions.get(wo.id)
    if (position === undefined) return wo
    return wo.id === id ? { ...wo, status, position } : { ...wo, position }
  })
}

export function byPosition(a: Pick<WorkOrder, 'position'>, b: Pick<WorkOrder, 'position'>) {
  return a.position - b.position
}

/** An asset is down while a critical corrective job is open, in maintenance while work is in progress. */
export function deriveAssetState(workOrders: readonly Pick<WorkOrder, 'status' | 'type' | 'priority'>[]): AssetState {
  const open = workOrders.filter((wo) => wo.status !== 'done')
  if (open.some((wo) => wo.type === 'corrective' && wo.priority === 'critical')) return 'down'
  if (open.some((wo) => wo.status === 'in_progress')) return 'maintenance'
  return 'running'
}

/** Local calendar date as "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isOverdue(workOrder: Pick<WorkOrder, 'dueDate' | 'status'>, today = toIsoDate(new Date())) {
  return workOrder.status !== 'done' && workOrder.dueDate < today
}

/**
 * The board can be filtered, so a drop position among the visible cards has to
 * be mapped to an index in the full column: right before the next visible card,
 * or right after the previous one.
 */
export function toFullIndex(fullColumn: readonly string[], visibleColumn: readonly string[], id: string): number {
  const others = fullColumn.filter((cardId) => cardId !== id)
  const at = visibleColumn.indexOf(id)
  const next = visibleColumn.slice(at + 1).find((cardId) => others.includes(cardId))
  if (next) return others.indexOf(next)
  const previous = visibleColumn.slice(0, Math.max(0, at)).findLast((cardId) => others.includes(cardId))
  return previous ? others.indexOf(previous) + 1 : others.length
}
