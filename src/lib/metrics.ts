import { STATUSES, type User, type WorkOrder, type WorkOrderStatus } from '../api/schemas'
import { isOverdue, toIsoDate } from './workflow'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export interface Metrics {
  open: number
  overdue: number
  inProgress: number
  completedLast7d: number
  /** Mean hours from creation to completion of corrective jobs closed in the last 30 days. */
  mttrHours: number | null
  byStatus: Record<WorkOrderStatus, number>
  /** Share of preventive + inspection work among jobs closed in the last 30 days (0-100). */
  plannedShare: number | null
}

export function computeMetrics(workOrders: readonly WorkOrder[], now = Date.now()): Metrics {
  const today = toIsoDate(new Date(now))
  const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<WorkOrderStatus, number>
  for (const wo of workOrders) byStatus[wo.status] += 1

  const closedSince = (days: number) =>
    workOrders.filter((wo) => wo.completedAt && now - Date.parse(wo.completedAt) <= days * DAY_MS)

  const closed30 = closedSince(30)
  const corrective = closed30.filter((wo) => wo.type === 'corrective')
  const mttrHours = corrective.length
    ? corrective.reduce((sum, wo) => sum + (Date.parse(wo.completedAt!) - Date.parse(wo.createdAt)), 0) /
      corrective.length /
      HOUR_MS
    : null

  return {
    open: workOrders.length - byStatus.done,
    overdue: workOrders.filter((wo) => isOverdue(wo, today)).length,
    inProgress: byStatus.in_progress,
    completedLast7d: closedSince(7).length,
    mttrHours,
    byStatus,
    plannedShare: closed30.length
      ? (closed30.filter((wo) => wo.type !== 'corrective').length / closed30.length) * 100
      : null,
  }
}

export interface Workload {
  user: User
  jobs: number
  hours: number
}

/** Open jobs and estimated hours per technician, busiest first. */
export function technicianWorkload(workOrders: readonly WorkOrder[], users: readonly User[]): Workload[] {
  return users
    .filter((user) => user.role === 'technician')
    .map((user) => {
      const mine = workOrders.filter((wo) => wo.assigneeId === user.id && wo.status !== 'done')
      return { user, jobs: mine.length, hours: mine.reduce((sum, wo) => sum + wo.estimatedHours, 0) }
    })
    .sort((a, b) => b.hours - a.hours || a.user.name.localeCompare(b.user.name))
}
