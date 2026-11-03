import { z } from 'zod'

// Every type in the app is inferred from these schemas. API responses are parsed with them at runtime.

export const ROLES = ['admin', 'planner', 'technician', 'viewer'] as const
export const roleSchema = z.enum(ROLES)
export type Role = z.infer<typeof roleSchema>

export const TRADES = ['mechanical', 'electrical', 'instrumentation', 'general'] as const
export const tradeSchema = z.enum(TRADES)
export type Trade = z.infer<typeof tradeSchema>

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: roleSchema,
  trade: tradeSchema,
})
export type User = z.infer<typeof userSchema>

export const userPatchSchema = z.object({ role: roleSchema })
export type UserPatch = z.infer<typeof userPatchSchema>

export const CRITICALITIES = ['A', 'B', 'C'] as const
export const criticalitySchema = z.enum(CRITICALITIES)
export type Criticality = z.infer<typeof criticalitySchema>

export const ASSET_STATES = ['running', 'maintenance', 'down'] as const
export const assetStateSchema = z.enum(ASSET_STATES)
export type AssetState = z.infer<typeof assetStateSchema>

export const assetSchema = z.object({
  id: z.string(),
  /** Plant tag, e.g. "CMP-101". */
  tag: z.string(),
  name: z.string(),
  location: z.string(),
  criticality: criticalitySchema,
  /** Derived from open work orders on the server. */
  state: assetStateSchema,
  openWorkOrders: z.number().int().nonnegative(),
})
export type Asset = z.infer<typeof assetSchema>

export const assetInputSchema = z.object({
  tag: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,4}-\d{2,4}$/, 'tag'),
  name: z.string().trim().min(2, 'nameShort').max(60, 'nameLong'),
  location: z.string().trim().min(2, 'locationShort').max(40, 'locationLong'),
  criticality: criticalitySchema,
})
export type AssetInput = z.infer<typeof assetInputSchema>

export const STATUSES = ['open', 'scheduled', 'in_progress', 'on_hold', 'done'] as const
export const statusSchema = z.enum(STATUSES)
export type WorkOrderStatus = z.infer<typeof statusSchema>

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export const prioritySchema = z.enum(PRIORITIES)
export type Priority = z.infer<typeof prioritySchema>

export const WORK_TYPES = ['corrective', 'preventive', 'inspection'] as const
export const workTypeSchema = z.enum(WORK_TYPES)
export type WorkType = z.infer<typeof workTypeSchema>

export const checklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  done: z.boolean(),
})
export type ChecklistItem = z.infer<typeof checklistItemSchema>

export const workOrderSchema = z.object({
  id: z.string(),
  /** Human-readable number, e.g. "WO-1042". */
  code: z.string(),
  title: z.string(),
  description: z.string(),
  assetId: z.string(),
  type: workTypeSchema,
  priority: prioritySchema,
  status: statusSchema,
  assigneeId: z.string().nullable(),
  /** "YYYY-MM-DD". */
  dueDate: z.string(),
  estimatedHours: z.number().positive(),
  checklist: z.array(checklistItemSchema),
  /** Order inside its board column; lower comes first. */
  position: z.number(),
  createdAt: z.iso.datetime(),
  createdById: z.string(),
  completedAt: z.iso.datetime().nullable(),
})
export type WorkOrder = z.infer<typeof workOrderSchema>

export const ACTIVITY_KINDS = ['created', 'status', 'assigned', 'edited', 'comment', 'checklist'] as const

export const activitySchema = z.object({
  id: z.string(),
  workOrderId: z.string(),
  at: z.iso.datetime(),
  actorId: z.string(),
  kind: z.enum(ACTIVITY_KINDS),
  /** Status or assignee before/after, checklist item label, or comment body. */
  from: z.string().nullable(),
  to: z.string().nullable(),
  text: z.string().nullable(),
})
export type Activity = z.infer<typeof activitySchema>

export const workOrderDetailSchema = workOrderSchema.extend({
  activity: z.array(activitySchema),
})
export type WorkOrderDetail = z.infer<typeof workOrderDetailSchema>

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date')

export const workOrderInputSchema = z.object({
  title: z.string().trim().min(4, 'titleShort').max(80, 'titleLong'),
  description: z.string().trim().max(1000, 'descriptionLong'),
  assetId: z.string().min(1, 'assetRequired'),
  type: workTypeSchema,
  priority: prioritySchema,
  assigneeId: z.string().nullable(),
  dueDate: isoDate,
  estimatedHours: z.number('hours').positive('hours').max(200, 'hours'),
  checklist: z.array(z.string().trim().min(1).max(120)).max(20),
})
export type WorkOrderInput = z.infer<typeof workOrderInputSchema>

/** Edits keep checklist progress; the checklist itself is toggled item by item. */
export const workOrderPatchSchema = workOrderInputSchema.omit({ checklist: true }).partial()
export type WorkOrderPatch = z.infer<typeof workOrderPatchSchema>

export const moveSchema = z.object({
  status: statusSchema,
  /** Index inside the target column, after the card is removed from its old place. */
  index: z.number().int().nonnegative(),
})
export type MoveInput = z.infer<typeof moveSchema>

export const commentInputSchema = z.object({
  text: z.string().trim().min(1, 'commentEmpty').max(1000, 'commentLong'),
})
export type CommentInput = z.infer<typeof commentInputSchema>

export const checklistToggleSchema = z.object({ done: z.boolean() })

export const apiErrorBodySchema = z.object({
  message: z.string(),
  /** Machine-readable reason, e.g. "forbidden", "checklist_incomplete". */
  code: z.string().optional(),
})
