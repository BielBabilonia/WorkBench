import type {
  Activity,
  Asset,
  AssetInput,
  CommentInput,
  MoveInput,
  User,
  UserPatch,
  WorkOrder,
  WorkOrderDetail,
  WorkOrderInput,
  WorkOrderPatch,
} from '../api/schemas'
import { canMove, canToggleChecklist, hasPermission, type Permission } from '../lib/permissions'
import { applyMove, byPosition, deriveAssetState, moveBlocker } from '../lib/workflow'
import { createSeed, type DbState } from './seed'

/**
 * In-memory backend. Every rule the UI shows (permissions, workflow) is enforced
 * here too, so a request the UI wouldn't make still gets the right 403/409/422.
 */

export class DbError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

const notFound = (what: string) => new DbError(404, 'not_found', `${what} not found`)
const forbidden = () => new DbError(403, 'forbidden', 'You don’t have permission to do this')

type Listener = (state: DbState) => void

function createDb() {
  let state = createSeed()
  const listeners = new Set<Listener>()

  const changed = () => listeners.forEach((listener) => listener(state))
  const newId = (prefix: string) => `${prefix}-${state.nextId++}`
  const nowIso = () => new Date().toISOString()

  function user(id: string): User {
    const found = state.users.find((u) => u.id === id)
    if (!found) throw notFound('User')
    return found
  }

  function require(actor: User, permission: Permission) {
    if (!hasPermission(actor.role, permission)) throw forbidden()
  }

  function workOrder(id: string): WorkOrder {
    const found = state.workOrders.find((wo) => wo.id === id)
    if (!found) throw notFound('Work order')
    return found
  }

  function replace(next: WorkOrder) {
    state.workOrders = state.workOrders.map((wo) => (wo.id === next.id ? next : wo))
  }

  function log(entry: Omit<Activity, 'id' | 'at' | 'from' | 'to' | 'text'> & Partial<Activity>) {
    state.activity.push({ id: newId('act'), at: nowIso(), from: null, to: null, text: null, ...entry })
  }

  function toAsset(record: DbState['assets'][number]): Asset {
    const jobs = state.workOrders.filter((wo) => wo.assetId === record.id)
    return {
      ...record,
      state: deriveAssetState(jobs),
      openWorkOrders: jobs.filter((wo) => wo.status !== 'done').length,
    }
  }

  function assertAsset(id: string) {
    if (!state.assets.some((a) => a.id === id)) throw new DbError(422, 'invalid_asset', 'Unknown asset')
  }

  function assertAssignee(id: string | null) {
    if (id && user(id).role !== 'technician') {
      throw new DbError(422, 'invalid_assignee', 'Work can only be assigned to technicians')
    }
  }

  function blockMove(wo: WorkOrder, status: WorkOrder['status']) {
    const blocker = moveBlocker(wo, status)
    if (blocker === 'unassigned') throw new DbError(422, blocker, 'Assign a technician first')
    if (blocker === 'checklist_incomplete') {
      throw new DbError(422, blocker, 'Complete the checklist before closing the work order')
    }
  }

  return {
    user,

    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    /** Restores a saved state (browser persistence). */
    load(saved: DbState) {
      state = saved
    },

    reset() {
      state = createSeed()
      changed()
    },

    listUsers: (): User[] => state.users,

    updateUser(actor: User, id: string, patch: UserPatch): User {
      require(actor, 'user.manage')
      const target = user(id)
      const admins = state.users.filter((u) => u.role === 'admin')
      if (target.role === 'admin' && patch.role !== 'admin' && admins.length === 1) {
        throw new DbError(409, 'last_admin', 'There must be at least one admin')
      }
      if (patch.role !== 'technician' && target.role === 'technician') {
        if (state.workOrders.some((wo) => wo.assigneeId === id && wo.status === 'in_progress')) {
          throw new DbError(409, 'has_work_in_progress', 'This technician has work in progress')
        }
        // Pending work goes back to the planners' queue.
        state.workOrders = state.workOrders.map((wo) =>
          wo.assigneeId === id && wo.status !== 'done' ? { ...wo, assigneeId: null } : wo,
        )
      }
      const updated = { ...target, ...patch }
      state.users = state.users.map((u) => (u.id === id ? updated : u))
      changed()
      return updated
    },

    listAssets: (): Asset[] => state.assets.map(toAsset).sort((a, b) => a.tag.localeCompare(b.tag)),

    getAsset(id: string): Asset {
      const record = state.assets.find((a) => a.id === id)
      if (!record) throw notFound('Asset')
      return toAsset(record)
    },

    createAsset(actor: User, input: AssetInput): Asset {
      require(actor, 'asset.manage')
      if (state.assets.some((a) => a.tag === input.tag)) {
        throw new DbError(409, 'duplicate_tag', `Tag ${input.tag} is already in use`)
      }
      const record = { id: newId('a'), ...input }
      state.assets.push(record)
      changed()
      return toAsset(record)
    },

    listWorkOrders: (): WorkOrder[] => [...state.workOrders].sort(byPosition),

    getWorkOrder(id: string): WorkOrderDetail {
      return {
        ...workOrder(id),
        activity: state.activity.filter((a) => a.workOrderId === id).sort((a, b) => a.at.localeCompare(b.at)),
      }
    },

    createWorkOrder(actor: User, input: WorkOrderInput): WorkOrder {
      require(actor, 'workOrder.create')
      assertAsset(input.assetId)
      assertAssignee(input.assigneeId)
      const status = input.assigneeId ? 'scheduled' : 'open'
      const column = state.workOrders.filter((wo) => wo.status === status)
      const created: WorkOrder = {
        ...input,
        id: newId('wo'),
        code: `WO-${state.nextCode++}`,
        status,
        checklist: input.checklist.map((label) => ({ id: newId('chk'), label, done: false })),
        // New work goes to the top of its column.
        position: Math.min(0, ...column.map((wo) => wo.position)) - 1,
        createdAt: nowIso(),
        createdById: actor.id,
        completedAt: null,
      }
      state.workOrders.push(created)
      log({ workOrderId: created.id, actorId: actor.id, kind: 'created' })
      if (created.assigneeId) {
        log({ workOrderId: created.id, actorId: actor.id, kind: 'assigned', to: created.assigneeId })
      }
      changed()
      return created
    },

    updateWorkOrder(actor: User, id: string, patch: WorkOrderPatch): WorkOrder {
      require(actor, 'workOrder.edit')
      const current = workOrder(id)
      if (patch.assetId) assertAsset(patch.assetId)
      if (patch.assigneeId !== undefined && patch.assigneeId !== current.assigneeId) {
        require(actor, 'workOrder.assign')
        assertAssignee(patch.assigneeId)
        if (!patch.assigneeId && (current.status === 'in_progress' || current.status === 'done')) {
          throw new DbError(422, 'unassigned', 'Work in progress needs an assignee')
        }
        log({ workOrderId: id, actorId: actor.id, kind: 'assigned', from: current.assigneeId, to: patch.assigneeId })
      }
      if (Object.keys(patch).some((key) => key !== 'assigneeId')) {
        log({ workOrderId: id, actorId: actor.id, kind: 'edited' })
      }
      const updated = { ...current, ...patch }
      replace(updated)
      changed()
      return updated
    },

    moveWorkOrder(actor: User, id: string, { status, index }: MoveInput): WorkOrder {
      const current = workOrder(id)
      if (!canMove(actor, current, status)) throw forbidden()
      if (status !== current.status) blockMove(current, status)
      state.workOrders = applyMove(state.workOrders, id, status, index)
      if (status !== current.status) {
        replace({ ...workOrder(id), completedAt: status === 'done' ? nowIso() : null })
        log({ workOrderId: id, actorId: actor.id, kind: 'status', from: current.status, to: status })
      }
      changed()
      return workOrder(id)
    },

    toggleChecklistItem(actor: User, id: string, itemId: string, done: boolean): WorkOrder {
      const current = workOrder(id)
      if (!canToggleChecklist(actor, current)) throw forbidden()
      const item = current.checklist.find((c) => c.id === itemId)
      if (!item) throw notFound('Checklist item')
      const updated = {
        ...current,
        checklist: current.checklist.map((c) => (c.id === itemId ? { ...c, done } : c)),
      }
      replace(updated)
      if (done) log({ workOrderId: id, actorId: actor.id, kind: 'checklist', text: item.label })
      changed()
      return updated
    },

    addComment(actor: User, id: string, { text }: CommentInput): Activity {
      require(actor, 'workOrder.comment')
      workOrder(id)
      log({ workOrderId: id, actorId: actor.id, kind: 'comment', text })
      changed()
      return state.activity[state.activity.length - 1]
    },

    deleteWorkOrder(actor: User, id: string) {
      require(actor, 'workOrder.delete')
      workOrder(id)
      state.workOrders = state.workOrders.filter((wo) => wo.id !== id)
      state.activity = state.activity.filter((a) => a.workOrderId !== id)
      changed()
    },
  }
}

export const db = createDb()
