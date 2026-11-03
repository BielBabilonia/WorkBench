import { describe, expect, it } from 'vitest'
import type { WorkOrderStatus } from '../api/schemas'
import { applyMove, deriveAssetState, isOverdue, moveBlocker, toFullIndex } from './workflow'

interface Card {
  id: string
  status: WorkOrderStatus
  position: number
}

const board: Card[] = [
  { id: 'a', status: 'open', position: 0 },
  { id: 'b', status: 'open', position: 1 },
  { id: 'c', status: 'open', position: 2 },
  { id: 'x', status: 'done', position: 0 },
]

const column = (list: Card[], status: WorkOrderStatus) =>
  list
    .filter((wo) => wo.status === status)
    .sort((p, q) => p.position - q.position)
    .map((wo) => wo.id)

describe('applyMove', () => {
  it('reorders inside a column', () => {
    expect(column(applyMove(board, 'c', 'open', 0), 'open')).toEqual(['c', 'a', 'b'])
    expect(column(applyMove(board, 'a', 'open', 2), 'open')).toEqual(['b', 'c', 'a'])
  })

  it('moves across columns and renumbers both', () => {
    const next = applyMove(board, 'b', 'done', 1)
    expect(column(next, 'open')).toEqual(['a', 'c'])
    expect(column(next, 'done')).toEqual(['x', 'b'])
    expect(next.find((wo) => wo.id === 'c')?.position).toBe(1)
  })

  it('clamps an index past the end', () => {
    expect(column(applyMove(board, 'a', 'done', 99), 'done')).toEqual(['x', 'a'])
  })

  it('is idempotent, so an optimistic update can be applied twice', () => {
    const once = applyMove(board, 'a', 'done', 0)
    expect(applyMove(once, 'a', 'done', 0)).toEqual(once)
  })
})

describe('moveBlocker', () => {
  const checklist = [{ id: '1', label: 'Step', done: false }]

  it('needs an assignee to start or finish work', () => {
    expect(moveBlocker({ assigneeId: null, checklist: [] }, 'in_progress')).toBe('unassigned')
    expect(moveBlocker({ assigneeId: null, checklist: [] }, 'done')).toBe('unassigned')
    expect(moveBlocker({ assigneeId: null, checklist: [] }, 'scheduled')).toBeNull()
  })

  it('needs a complete checklist to close', () => {
    expect(moveBlocker({ assigneeId: 'u', checklist }, 'done')).toBe('checklist_incomplete')
    expect(moveBlocker({ assigneeId: 'u', checklist }, 'on_hold')).toBeNull()
    expect(moveBlocker({ assigneeId: 'u', checklist: [{ ...checklist[0], done: true }] }, 'done')).toBeNull()
  })
})

describe('toFullIndex', () => {
  // Full column a b c d; only b and d are visible (filtered board).
  it('places the card before the next visible card', () => {
    expect(toFullIndex(['a', 'b', 'c', 'd'], ['x', 'b', 'd'], 'x')).toBe(1)
    expect(toFullIndex(['a', 'b', 'c', 'd'], ['b', 'x', 'd'], 'x')).toBe(3)
  })

  it('places the card after the last visible card', () => {
    expect(toFullIndex(['a', 'b', 'c', 'd'], ['b', 'd', 'x'], 'x')).toBe(4)
  })

  it('ignores the card itself when it was already in the column', () => {
    expect(toFullIndex(['a', 'b', 'c'], ['c', 'a'], 'c')).toBe(0)
  })

  it('goes to the end of an empty visible column', () => {
    expect(toFullIndex(['a', 'b'], ['x'], 'x')).toBe(2)
  })
})

describe('deriveAssetState', () => {
  it('is down with an open critical corrective job, in maintenance while work runs', () => {
    expect(deriveAssetState([{ status: 'open', type: 'corrective', priority: 'critical' }])).toBe('down')
    expect(deriveAssetState([{ status: 'done', type: 'corrective', priority: 'critical' }])).toBe('running')
    expect(deriveAssetState([{ status: 'in_progress', type: 'preventive', priority: 'low' }])).toBe('maintenance')
    expect(deriveAssetState([])).toBe('running')
  })
})

describe('isOverdue', () => {
  it('compares calendar dates and ignores finished work', () => {
    expect(isOverdue({ dueDate: '2026-01-09', status: 'open' }, '2026-01-10')).toBe(true)
    expect(isOverdue({ dueDate: '2026-01-10', status: 'open' }, '2026-01-10')).toBe(false)
    expect(isOverdue({ dueDate: '2026-01-01', status: 'done' }, '2026-01-10')).toBe(false)
  })
})
