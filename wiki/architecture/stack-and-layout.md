# Stack And Layout

Status: active synthesis

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

## Database Baseline

Existing Supabase migrations are copied into `supabase/migrations/`. Rebuild schema changes are forward migrations, not a squashed baseline.

## Behavior Placement

Routes should stay thin. Product behavior belongs in feature `commands.ts`, `queries.ts`, `public-queries.ts`, and `server-functions.ts` modules. Server functions are wrappers over command/query logic, not the home of product rules.

## Checks

Use `npm run typecheck`, `npm run test`, `npm run test:e2e`, and `npm run build` before calling implementation work complete. For schema work, also apply local migrations and regenerate database types.
