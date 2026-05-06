# Coding Rules

Status: active synthesis

## Core Rules

- Keep TanStack route files thin.
- Put product behavior in feature commands and queries.
- Server functions are thin wrappers over commands and queries.
- Validate inputs with Zod.
- Use typed AppError conventions.
- Use Supabase service-role clients only after explicit app authorization.
- Do not commit without permission.
- Keep docs and wiki synchronized with meaningful product, data, architecture, or design changes.

## Source Layout

- Routes live in `src/routes`.
- Feature code lives in `src/features/*`.
- shadcn primitives live in `src/components/ui`.
- Stagecom reusable components live in `src/components/stage`.
- Server utilities live in `src/server`.
- Generated Supabase types live in `src/server/db/database.types.ts`.
- Unit tests live beside command/query modules.
- Playwright tests live in `e2e/`.

Use `@/*` as the single alias for `src/*`.

## Feature Modules

Use this shape unless a feature is too small to need every file:

```txt
src/features/example/
  commands.ts
  queries.ts
  public-queries.ts
  schemas.ts
  server-functions.ts
  components/
```

Private reads and all mutations go through the app-owned API/server-function layer. Public theater/event pages use separate anonymous-safe public queries.

## Supabase Clients

Use anon/user-scoped clients for normal user operations. Use service-role clients only inside server code after explicit app-level authorization has already established that the current user may perform the action.

## Error And Validation Contract

Validate inputs with Zod at the command/server-function boundary. Return or throw typed `AppError` values consistently so route components can show predictable validation, permission, not-found, and unexpected-error states.

## Checks

Run relevant checks before calling work complete:

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

When schema migrations change the local database, also run:

```bash
npm run db:migrate:local
npm run db:types
```
