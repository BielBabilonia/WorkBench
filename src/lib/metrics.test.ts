import { describe, expect, it } from 'vitest'
import type { User, WorkOrder } from '../api/schemas'
import { computeMetrics, technicianWorkload } from './metrics'

const NOW = Date.parse('2026-03-10T12:00:00Z')
const HOUR = 3_600_000
let nextId = 0

const wo = (overrides: Partial<WorkOrder>): WorkOrder => ({
  id: `wo-${nextId++}`,
  code: 'WO-1',
  title: 'Job',
  description: '',
  assetId: 'a',
  type: 'corrective',
  priority: 'medium',
  status: 'open',
  assigneeId: null,
  dueDate: '2026-03-20',
  estimatedHours: 2,
  checklist: [],
  position: 0,
  createdAt: new Date(NOW - 48 * HOUR).toISOString(),
  createdById: 'u',
  completedAt: null,
  ...overrides,
})

describe('computeMetrics', () => {
  it('counts open, overdue and recently completed work', () => {
    const metrics = computeMetrics(
      [
        wo({ status: 'open', dueDate: '2026-03-01' }),
        wo({ status: 'in_progress' }),
        wo({ status: 'done', completedAt: new Date(NOW - 24 * HOUR).toISOString() }),
        wo({ status: 'done', completedAt: new Date(NOW - 20 * 24 * HOUR).toISOString() }),
      ],
      NOW,
    )
    expect(metrics).toMatchObject({ open: 2, overdue: 1, inProgress: 1, completedLast7d: 1 })
  })

  it('averages repair time over corrective jobs only', () => {
    const createdAt = new Date(NOW - 10 * HOUR).toISOString()
    const metrics = computeMetrics(
      [
        wo({ status: 'done', createdAt, completedAt: new Date(NOW - 6 * HOUR).toISOString() }),
        wo({ status: 'done', createdAt, completedAt: new Date(NOW - 2 * HOUR).toISOString() }),
        wo({ status: 'done', type: 'preventive', createdAt, completedAt: new Date(NOW).toISOString() }),
      ],
      NOW,
    )
    expect(metrics.mttrHours).toBe(6)
    expect(metrics.plannedShare).toBeCloseTo(33.33, 1)
  })

  it('has no MTTR without data', () => {
    expect(computeMetrics([], NOW).mttrHours).toBeNull()
  })
})

describe('technicianWorkload', () => {
  it('sums open hours per technician, busiest first', () => {
    const users: User[] = [
      { id: 't1', name: 'Ana', email: '', role: 'technician', trade: 'general' },
      { id: 't2', name: 'Bia', email: '', role: 'technician', trade: 'general' },
      { id: 'p', name: 'Plan', email: '', role: 'planner', trade: 'general' },
    ]
    const result = technicianWorkload(
      [
        wo({ assigneeId: 't2', estimatedHours: 5 }),
        wo({ assigneeId: 't2', estimatedHours: 1, status: 'done' }),
        wo({ assigneeId: 't1', estimatedHours: 2 }),
      ],
      users,
    )
    expect(result.map((w) => [w.user.id, w.jobs, w.hours])).toEqual([
      ['t2', 1, 5],
      ['t1', 1, 2],
    ])
  })
})
