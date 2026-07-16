# Stagecom Rebuild Plans

Status: historical planning record

These docs preserve the TanStack rebuild decisions made before implementation. They are no longer the primary product source: use `CONTEXT.md`, `wiki/`, and active documents under `docs/product/`, `docs/data/`, and `docs/specs/`. Rebuild plans remain useful for implementation history and details that current documents still reference.

## Plan Set

- `01-repo-strategy.md`: new repository shape, docs/wiki strategy, migration baseline.
- `02-database-delta.md`: high-level database keep/change/defer plan.
- `03-route-map.md`: public, onboarding, app, and internal route model.
- `04-api-contract.md`: server function, command/query, validation, and error conventions.
- `05-first-slice-page-specs.md`: auth, onboarding, setup, preview, and public theater page behavior.
- `06-design-baseline.md`: practical design operating system for the first slice.
- `07-auth-flow.md`: magic-link, invite, redirect, and profile completion behavior.
- `08-acceptance-tests.md`: definition of done, test strategy, and milestone order.
- `09-project-conventions.md`: TanStack project structure and coding conventions.
- `10-supabase-environment.md`: Supabase project, env, migrations, storage, and seed strategy.
- `11-schema-delta-spec.md`: concrete schema delta intent.
- `12-docs-migration.md`: raw docs/wiki/archive migration strategy.
- `13-design-token-spec.md`: minimal token starter set.

## Direction At The Time Of Planning

- Framework: TanStack Start, React, TypeScript.
- Product center: theater operator/admin first.
- Business: hosted SaaS first; self-host-compatible later.
- Database: keep current Supabase/Postgres baseline and add forward reset deltas.
- UI: shadcn/ui, Tailwind, Stagecom fonts/colors retained and refined.
- Foundation slice: signup, onboarding, Theater setup, public preview, and published public Theater home.

The foundation slice has since been distinguished from the first meaningful product milestone. The current milestone continues through Event casting, scheduling, review, approval, and publication; see `docs/product/event-publication-milestone.md`.
