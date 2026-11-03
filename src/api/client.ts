import { z } from 'zod'
import {
  activitySchema,
  apiErrorBodySchema,
  assetSchema,
  userSchema,
  workOrderDetailSchema,
  workOrderSchema,
  type AssetInput,
  type CommentInput,
  type MoveInput,
  type UserPatch,
  type WorkOrderInput,
  type WorkOrderPatch,
} from './schemas'
import { SESSION_HEADER } from './session-header'

export type ApiErrorKind = 'http' | 'network' | 'parse'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | null
  /** Machine-readable reason sent by the server, e.g. "checklist_incomplete". */
  readonly code: string | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, code: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.code = code
  }

  get isNotFound() {
    return this.status === 404
  }
}

let apiReady: Promise<unknown> = Promise.resolve()

/**
 * Requests wait for `promise` before hitting the network. The app renders
 * (skeletons) while the mock service worker boots instead of blocking on it.
 */
export function waitForApi(promise: Promise<unknown>) {
  apiReady = promise.catch(() => undefined)
}

let sessionUserId: string | null = null

/** Set by the session provider; sent with every request. */
export function setSessionUser(id: string | null) {
  sessionUserId = id
}

function apiBase() {
  // Absolute URL so the same client works in the browser and in jsdom tests.
  return `${window.location.origin}/api`
}

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  await apiReady
  let response: Response
  try {
    response = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionUserId ? { [SESSION_HEADER]: sessionUserId } : {}),
        ...init?.headers,
      },
    })
  } catch (error) {
    throw new ApiError('network', error instanceof Error ? error.message : 'Network error')
  }

  const body: unknown = response.status === 204 ? undefined : await response.json().catch(() => undefined)

  if (!response.ok) {
    const parsed = apiErrorBodySchema.safeParse(body)
    throw new ApiError(
      'http',
      parsed.success ? parsed.data.message : response.statusText,
      response.status,
      parsed.success ? (parsed.data.code ?? null) : null,
    )
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ApiError('parse', `Unexpected response from ${path}: ${z.prettifyError(result.error)}`)
  }
  return result.data
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) })
const wo = (id: string) => `/work-orders/${encodeURIComponent(id)}`

export const api = {
  listUsers: () => request('/users', z.array(userSchema)),
  updateUser: (id: string, patch: UserPatch) =>
    request(`/users/${encodeURIComponent(id)}`, userSchema, json('PATCH', patch)),

  listAssets: () => request('/assets', z.array(assetSchema)),
  getAsset: (id: string) => request(`/assets/${encodeURIComponent(id)}`, assetSchema),
  createAsset: (input: AssetInput) => request('/assets', assetSchema, json('POST', input)),

  listWorkOrders: () => request('/work-orders', z.array(workOrderSchema)),
  getWorkOrder: (id: string) => request(wo(id), workOrderDetailSchema),
  createWorkOrder: (input: WorkOrderInput) => request('/work-orders', workOrderSchema, json('POST', input)),
  updateWorkOrder: (id: string, patch: WorkOrderPatch) => request(wo(id), workOrderSchema, json('PATCH', patch)),
  moveWorkOrder: (id: string, move: MoveInput) => request(`${wo(id)}/move`, workOrderSchema, json('POST', move)),
  toggleChecklistItem: (id: string, itemId: string, done: boolean) =>
    request(`${wo(id)}/checklist/${encodeURIComponent(itemId)}`, workOrderSchema, json('PUT', { done })),
  addComment: (id: string, input: CommentInput) =>
    request(`${wo(id)}/comments`, activitySchema, json('POST', input)),
  deleteWorkOrder: (id: string) => request(wo(id), z.undefined(), { method: 'DELETE' }),

  resetDemo: () => request('/demo/reset', z.undefined(), { method: 'POST' }),
}
