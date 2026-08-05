# Stack And Layout

Documentation status: active

Implementation status: implemented

## Stack

- TanStack Start
- React
- TypeScript
- Supabase Auth/Postgres
- shadcn/ui
- Tailwind CSS
- TanStack Query
- TanStack Table
- Vitest
- Playwright

## Layout Direction

Use file-based TanStack routes under `src/routes`, feature code under `src/features`, shadcn primitives under `src/components/ui`, and Stagecom reusable components under `src/components/stage`.

Stagecom has two persistent navigation shells. Public, authentication,
invitation, and Join Link routes use the root Public navigation. Routes under
`/app` replace it with the authenticated App navigation, and Theater workspace
routes add Theater-scoped navigation using the Theater's name. This keeps
entry and acceptance routes oriented without duplicating navigation inside the
application shell.

## Demo Environment

Deterministic user-testing data is created by `npm run demo:seed` against local
Supabase or an explicitly selected dedicated hosted demo project. Demo persona
access is server-gated and must never be enabled against production or the
shared development project. See `docs/development/demo-environment.md` for the
seeded story, reset scope, and operating procedure.

## Database Baseline

Existing Supabase migrations are copied into `supabase/migrations/`. Rebuild schema changes are forward migrations, not a squashed baseline.

## Behavior Placement

Routes should stay thin. Product behavior belongs in feature `commands.ts`, `queries.ts`, `public-queries.ts`, and `server-functions.ts` modules. Server functions are wrappers over command/query logic, not the home of product rules.

## Checks

Use `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build` before calling implementation work complete. For schema work, also apply local migrations and regenerate database types.

## Milestone Acceptance Seams

The Event-publication milestone uses one seeded Playwright journey through the
real route and server-function boundary with distinct authenticated browser
contexts plus an anonymous context. Focused Playwright specs keep alternate
outcomes independently diagnosable. pgTAP is reserved for transactional and
concurrent database invariants, including reservations and supplied-clock
maintenance; Vitest covers typed command contracts and deterministic pure
policy only.
