# TanStack Project Conventions

Status: active rebuild plan

## Structure

```txt
src/
  routes/
  routeTree.gen.ts
  components/
    ui/
    stage/
  features/
  integrations/
    tanstack-query/
  server/
    auth/
    db/
      database.types.ts
    supabase/
    errors.ts
    env.ts
    schemas.ts
    validation.ts
  styles.css
  lib/
    utils.ts
```

## Routes

- Use TanStack file-based routes under `src/routes`.
- Use pathless layout routes for public, onboarding, app, and internal shells.
- Commit generated `src/routeTree.gen.ts`.
- Keep route files thin.

## Feature Modules

Typical feature:

```txt
src/features/theaters/
  commands.ts
  queries.ts
  public-queries.ts
  schemas.ts
  server-functions.ts
  components/
  commands.test.ts
  queries.test.ts
```

## Components

- `src/components/ui`: shadcn primitives.
- `src/components/stage`: Stagecom reusable components.
- Feature UI starts in feature folders and is promoted only after real reuse.

## Imports And Tests

- Use one alias: `@/*` maps to `src/*`.
- Do not introduce a second source alias; generated/runtime package aliases should also point to `@/*` when configurable.
- Unit tests live beside command/query code.
- Playwright tests live in `e2e/`.
- Use minimal barrel exports only.

## Styling

- Global CSS only for tokens, fonts, base atmosphere, and reusable token-level classes.
- Tailwind for layout/composition.
- Component variants for repeated UI patterns.
