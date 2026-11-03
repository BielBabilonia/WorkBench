import { describe, expect, it } from 'vitest'
import type { User } from '../api/schemas'
import { canDrag, canMove, canToggleChecklist, hasPermission } from './permissions'

const user = (role: User['role'], id = 'u1'): User => ({ id, name: 'Test', email: 't@t', role, trade: 'general' })

describe('permissions', () => {
  it('grants by role', () => {
    expect(hasPermission('admin', 'user.manage')).toBe(true)
    expect(hasPermission('planner', 'user.manage')).toBe(false)
    expect(hasPermission('planner', 'workOrder.assign')).toBe(true)
    expect(hasPermission('technician', 'workOrder.create')).toBe(false)
    expect(hasPermission('viewer', 'workOrder.comment')).toBe(false)
  })

  it('lets planners move anything', () => {
    expect(canMove(user('planner'), { assigneeId: null, status: 'open' }, 'done')).toBe(true)
  })

  it('lets technicians move only their own work, outside triage', () => {
    const tech = user('technician')
    const mine = { assigneeId: 'u1', status: 'scheduled' as const }
    expect(canMove(tech, mine, 'in_progress')).toBe(true)
    expect(canMove(tech, mine, 'open')).toBe(false)
    expect(canMove(tech, { ...mine, status: 'open' }, 'scheduled')).toBe(false)
    expect(canMove(tech, { ...mine, assigneeId: 'someone-else' }, 'in_progress')).toBe(false)
    expect(canDrag(tech, mine)).toBe(true)
    expect(canDrag(tech, { ...mine, assigneeId: null })).toBe(false)
  })

  it('never lets viewers move or tick anything', () => {
    expect(canDrag(user('viewer'), { assigneeId: 'u1', status: 'scheduled' })).toBe(false)
    expect(canToggleChecklist(user('viewer'), { assigneeId: 'u1', status: 'in_progress' })).toBe(false)
  })

  it('locks the checklist once the job is done', () => {
    expect(canToggleChecklist(user('planner'), { assigneeId: null, status: 'done' })).toBe(false)
    expect(canToggleChecklist(user('technician'), { assigneeId: 'u1', status: 'in_progress' })).toBe(true)
  })
})
