import { beforeEach, describe, expect, it } from 'vitest'
import type { WorkOrderInput } from '../api/schemas'
import { db, DbError } from './db'

const planner = () => db.user('u-rafael')
const admin = () => db.user('u-marina')
const tech = () => db.user('u-joao')

function expectError(fn: () => unknown, status: number, code: string) {
  let caught: unknown
  try {
    fn()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(DbError)
  expect(caught).toMatchObject({ status, code })
}

const input = (overrides: Partial<WorkOrderInput> = {}): WorkOrderInput => ({
  title: 'Replace seal',
  description: '',
  assetId: 'a-cmp101',
  type: 'corrective',
  priority: 'high',
  assigneeId: null,
  dueDate: '2026-12-01',
  estimatedHours: 2,
  checklist: ['Isolate', 'Replace'],
  ...overrides,
})

describe('mock database', () => {
  beforeEach(() => db.reset())

  it('seeds a consistent board', () => {
    const workOrders = db.listWorkOrders()
    expect(workOrders.length).toBeGreaterThan(30)
    for (const wo of workOrders) {
      if (wo.status === 'done') expect(wo.checklist.every((c) => c.done)).toBe(true)
      if (wo.status === 'in_progress' || wo.status === 'done') expect(wo.assigneeId).not.toBeNull()
    }
  })

  it('creates work in Open, or Scheduled when assigned, at the top of the column', () => {
    expect(db.createWorkOrder(planner(), input()).status).toBe('open')
    const scheduled = db.createWorkOrder(planner(), input({ assigneeId: 'u-joao' }))
    expect(scheduled.status).toBe('scheduled')
    expect(db.listWorkOrders().filter((wo) => wo.status === 'scheduled')[0].id).toBe(scheduled.id)
    expect(db.getWorkOrder(scheduled.id).activity.map((a) => a.kind)).toEqual(['created', 'assigned'])
  })

  it('refuses to create work for technicians', () => {
    expectError(() => db.createWorkOrder(tech(), input()), 403, 'forbidden')
  })

  it('only assigns technicians', () => {
    expectError(() => db.createWorkOrder(planner(), input({ assigneeId: 'u-marina' })), 422, 'invalid_assignee')
  })

  it('enforces the workflow on moves', () => {
    const wo = db.createWorkOrder(planner(), input())
    expectError(() => db.moveWorkOrder(planner(), wo.id, { status: 'in_progress', index: 0 }), 422, 'unassigned')
    db.updateWorkOrder(planner(), wo.id, { assigneeId: 'u-joao' })
    expectError(() => db.moveWorkOrder(planner(), wo.id, { status: 'done', index: 0 }), 422, 'checklist_incomplete')
    for (const item of wo.checklist) db.toggleChecklistItem(tech(), wo.id, item.id, true)
    const done = db.moveWorkOrder(planner(), wo.id, { status: 'done', index: 0 })
    expect(done.status).toBe('done')
    expect(done.completedAt).not.toBeNull()
  })

  it('lets technicians move only their own work', () => {
    const mine = db.createWorkOrder(planner(), input({ assigneeId: 'u-joao' }))
    const theirs = db.createWorkOrder(planner(), input({ assigneeId: 'u-aisha' }))
    expect(db.moveWorkOrder(tech(), mine.id, { status: 'in_progress', index: 0 }).status).toBe('in_progress')
    expectError(() => db.moveWorkOrder(tech(), theirs.id, { status: 'in_progress', index: 0 }), 403, 'forbidden')
  })

  it('marks an asset down while a critical corrective job is open', () => {
    db.createWorkOrder(planner(), input({ assetId: 'a-hvc601', priority: 'critical' }))
    expect(db.getAsset('a-hvc601').state).toBe('down')
  })

  it('rejects duplicate asset tags', () => {
    expectError(
      () => db.createAsset(planner(), { tag: 'CMP-101', name: 'Dup', location: 'X', criticality: 'C' }),
      409,
      'duplicate_tag',
    )
  })

  it('keeps at least one admin, and only admins manage roles', () => {
    expectError(() => db.updateUser(admin(), 'u-marina', { role: 'viewer' }), 409, 'last_admin')
    expectError(() => db.updateUser(planner(), 'u-daniel', { role: 'admin' }), 403, 'forbidden')
  })

  it('returns pending work to the queue when a technician changes role', () => {
    const wo = db.createWorkOrder(planner(), input({ assigneeId: 'u-sofia' }))
    for (const running of db.listWorkOrders().filter((w) => w.assigneeId === 'u-sofia' && w.status === 'in_progress')) {
      db.updateWorkOrder(planner(), running.id, { assigneeId: 'u-joao' })
    }
    db.updateUser(admin(), 'u-sofia', { role: 'viewer' })
    expect(db.getWorkOrder(wo.id).assigneeId).toBeNull()
  })
})
