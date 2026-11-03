import { delay, http, HttpResponse } from 'msw'
import type { z } from 'zod'
import {
  assetInputSchema,
  checklistToggleSchema,
  commentInputSchema,
  moveSchema,
  userPatchSchema,
  workOrderInputSchema,
  workOrderPatchSchema,
  type User,
} from '../api/schemas'
import { SESSION_HEADER } from '../api/session-header'
import { db, DbError } from './db'

const API = '*/api'

function error(status: number, code: string, message: string) {
  return HttpResponse.json({ message, code }, { status })
}

async function latency() {
  // Instant in tests; a realistic 100-400 ms in the browser so loading states show.
  if (import.meta.env.MODE !== 'test') await delay()
}

async function parse<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const result = schema.safeParse(await request.json().catch(() => undefined))
  if (!result.success) throw new DbError(400, 'invalid_body', 'Invalid request body')
  return result.data
}

type Handler = (args: { request: Request; params: Record<string, string>; actor: User }) =>
  | Response
  | Promise<Response>

/** Resolves the signed-in user from the session header and maps DbError to HTTP errors. */
function authed(handler: Handler) {
  return async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
    await latency()
    const userId = request.headers.get(SESSION_HEADER)
    const actor = db.listUsers().find((u) => u.id === userId)
    if (!actor) return error(401, 'unauthenticated', 'Sign in to continue')
    try {
      return await handler({ request, params: params as Record<string, string>, actor })
    } catch (e) {
      if (e instanceof DbError) return error(e.status, e.code, e.message)
      throw e
    }
  }
}

export const handlers = [
  // Public: the demo sign-in screen lists who you can sign in as.
  http.get(`${API}/users`, async () => {
    await latency()
    return HttpResponse.json(db.listUsers())
  }),

  http.patch(
    `${API}/users/:id`,
    authed(async ({ request, params, actor }) =>
      HttpResponse.json(db.updateUser(actor, params.id, await parse(request, userPatchSchema))),
    ),
  ),

  http.get(`${API}/assets`, authed(() => HttpResponse.json(db.listAssets()))),

  http.get(`${API}/assets/:id`, authed(({ params }) => HttpResponse.json(db.getAsset(params.id)))),

  http.post(
    `${API}/assets`,
    authed(async ({ request, actor }) =>
      HttpResponse.json(db.createAsset(actor, await parse(request, assetInputSchema)), { status: 201 }),
    ),
  ),

  http.get(`${API}/work-orders`, authed(() => HttpResponse.json(db.listWorkOrders()))),

  http.get(`${API}/work-orders/:id`, authed(({ params }) => HttpResponse.json(db.getWorkOrder(params.id)))),

  http.post(
    `${API}/work-orders`,
    authed(async ({ request, actor }) =>
      HttpResponse.json(db.createWorkOrder(actor, await parse(request, workOrderInputSchema)), { status: 201 }),
    ),
  ),

  http.patch(
    `${API}/work-orders/:id`,
    authed(async ({ request, params, actor }) =>
      HttpResponse.json(db.updateWorkOrder(actor, params.id, await parse(request, workOrderPatchSchema))),
    ),
  ),

  http.post(
    `${API}/work-orders/:id/move`,
    authed(async ({ request, params, actor }) =>
      HttpResponse.json(db.moveWorkOrder(actor, params.id, await parse(request, moveSchema))),
    ),
  ),

  http.put(
    `${API}/work-orders/:id/checklist/:itemId`,
    authed(async ({ request, params, actor }) => {
      const { done } = await parse(request, checklistToggleSchema)
      return HttpResponse.json(db.toggleChecklistItem(actor, params.id, params.itemId, done))
    }),
  ),

  http.post(
    `${API}/work-orders/:id/comments`,
    authed(async ({ request, params, actor }) =>
      HttpResponse.json(db.addComment(actor, params.id, await parse(request, commentInputSchema)), { status: 201 }),
    ),
  ),

  http.delete(
    `${API}/work-orders/:id`,
    authed(({ params, actor }) => {
      db.deleteWorkOrder(actor, params.id)
      return new HttpResponse(null, { status: 204 })
    }),
  ),

  http.post(`${API}/demo/reset`, async () => {
    await latency()
    db.reset()
    return new HttpResponse(null, { status: 204 })
  }),
]
