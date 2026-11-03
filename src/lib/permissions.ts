import type { Role, User, WorkOrder, WorkOrderStatus } from '../api/schemas'

/**
 * Role-based access control, shared by the mock API (which enforces it with 403s)
 * and the UI (which hides or disables what the current user can't do).
 */

export type Permission =
  | 'workOrder.create'
  | 'workOrder.edit'
  | 'workOrder.assign'
  | 'workOrder.delete'
  | 'workOrder.comment'
  | 'workOrder.moveAny'
  | 'workOrder.moveOwn'
  | 'asset.manage'
  | 'user.manage'

const GRANTS: Record<Role, readonly Permission[]> = {
  admin: [
    'workOrder.create',
    'workOrder.edit',
    'workOrder.assign',
    'workOrder.delete',
    'workOrder.comment',
    'workOrder.moveAny',
    'asset.manage',
    'user.manage',
  ],
  planner: [
    'workOrder.create',
    'workOrder.edit',
    'workOrder.assign',
    'workOrder.comment',
    'workOrder.moveAny',
    'asset.manage',
  ],
  technician: ['workOrder.comment', 'workOrder.moveOwn'],
  viewer: [],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return GRANTS[role].includes(permission)
}

/** Statuses a technician may set: triage ("open") belongs to planners. */
const TECHNICIAN_STATUSES: readonly WorkOrderStatus[] = ['scheduled', 'in_progress', 'on_hold', 'done']

function isOwn(user: User, workOrder: Pick<WorkOrder, 'assigneeId'>) {
  return workOrder.assigneeId === user.id
}

/** Whether `user` may move `workOrder` to `status` (same column counts: reordering). */
export function canMove(
  user: User,
  workOrder: Pick<WorkOrder, 'assigneeId' | 'status'>,
  status: WorkOrderStatus,
): boolean {
  if (hasPermission(user.role, 'workOrder.moveAny')) return true
  if (!hasPermission(user.role, 'workOrder.moveOwn') || !isOwn(user, workOrder)) return false
  return TECHNICIAN_STATUSES.includes(workOrder.status) && TECHNICIAN_STATUSES.includes(status)
}

/** Whether the card can be picked up at all. */
export function canDrag(user: User, workOrder: Pick<WorkOrder, 'assigneeId' | 'status'>): boolean {
  return canMove(user, workOrder, workOrder.status)
}

/** Checklist items are ticked by whoever does the job, or by planners. */
export function canToggleChecklist(user: User, workOrder: Pick<WorkOrder, 'assigneeId' | 'status'>) {
  if (workOrder.status === 'done') return false
  return hasPermission(user.role, 'workOrder.edit') || (user.role === 'technician' && isOwn(user, workOrder))
}

/** Pages and the permission that unlocks them. Routes without an entry are open to everyone. */
export const ROUTE_PERMISSIONS = {
  users: 'user.manage',
} as const satisfies Record<string, Permission>
