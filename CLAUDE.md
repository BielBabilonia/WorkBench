# Workbench

Portfolio project: maintenance work-order system (CMMS-style) with a drag-and-drop Kanban board and
role-based access control. Goal: impress international frontend recruiters with the kind of app companies
actually build — permissions, workflow rules, complex forms. Simple scope, high polish.
All UI text, code, commits and README in English.

## Stack
- React 19 + Vite + TypeScript (TS pinned to ~6.0 — typescript-eslint doesn't support 7 yet)
- Tailwind CSS v4 via `@tailwindcss/vite`. Design tokens are CSS variables in `src/index.css` (`@theme inline`)
- TanStack Query, React Router, Zod v4, dnd-kit (`core`, `sortable`, `utilities`)
- MSW **v3** simulates the whole API (no backend). Worker runs in production too, for the demo.
  v3 API: `http`/`HttpResponse`/`delay` from `msw`, `setupWorker` from `msw/browser`,
  and the start option is `onUnhandledFrame` (not `onUnhandledRequest`).
- Vitest + Testing Library + user-event (jsdom, MSW node server in `src/test/setup.ts`), Playwright for E2E (`e2e/`)
- Deploy: Vercel (`vercel.json` SPA rewrite). CI: GitHub Actions (`.github/workflows/ci.yml`)

## Architecture
- `src/api/` — `schemas.ts` (Zod, source of every type), `client.ts` (typed fetch + Zod parsing + `ApiError`
  with server `code`, sends the session header), `queries.ts` (key factory, hooks, optimistic move/checklist)
- `src/lib/permissions.ts` — RBAC rules shared by the mock API (403s) and the UI (hide/disable). Change roles here.
- `src/lib/workflow.ts` — workflow rules shared by both sides: `moveBlocker` (assignee needed to start/finish,
  checklist complete to close), `applyMove` (pure board reorder), `toFullIndex` (filtered board → real index),
  `deriveAssetState`
- `src/mocks/` — `seed.ts` (seeded PRNG, users/assets/work orders/activity), `db.ts` (in-memory backend that
  enforces every rule), `handlers.ts` (REST under `/api`), `browser.ts` (persists the db to localStorage)
- `src/session/` — demo sign-in: user picked in the account menu, id sent as `X-Demo-User`
- `src/features/{dashboard,board,work-orders,assets,users}` — feature folders; route pages are lazy-loaded
- `src/i18n/` — EN (default) + PT-BR, flat typed dictionary, `useI18n().t(key, vars)`; `key.one` = singular
- `src/components/layout/AccountMenu.tsx` — native popover: demo user, theme, language, reset
- `src/theme/` — system/light/dark, `.dark` class on `<html>`, no-flash script in `index.html`

## Demo users
Marina (admin), Rafael (planner, default), João / Aisha / Lucas / Sofia (technicians), Daniel (viewer).

## Design direction
Should read like a real internal tool (Linear, Jira, GitHub), not a generated template:
- Neutral grays, ink-colored primary buttons; blue only for links and focus. No gradients, no shadows on cards.
- Status/priority as text (with a small dot), color only where it matters (high/critical, overdue).
- Plain, short copy: no greetings, no subtitles explaining the page, no icon circles in empty states.
- Preferences (theme, language, demo user) live in the account menu, not as toggles in the chrome.

## Conventions
- Strict TS, no `any`. Types come from Zod (`z.infer`), never duplicated.
- Every rule lives once in `lib/` and is used by both the mock server and the UI.
- Server state only in TanStack Query; local UI state in components. No global store.
- Feature-based folders; small components, named exports. Component files export only components (fast refresh).
- Tailwind only, no CSS files besides `index.css`. Use the semantic tokens (`bg-surface`, `text-muted`, `bg-danger-soft`...).
  There is no tailwind-merge: to change an input's width, wrap it instead of passing a `w-*` class.
- Every user-facing string goes through i18n (both `en.ts` and `pt-BR.ts`).
- Run `npm run typecheck`, `npm run lint` and `npm test` before finishing any task.
- Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`). Several small commits per change.
- Ask before adding any dependency not listed above.
