# Repo Strategy

Status: active rebuild plan

## Summary

Create a new repository for the Stagecom rebuild using TanStack Start as the full-stack React framework. The current repo remains the archive/reference until the new repo is established.

## Repository Shape

Use app-at-root layout for simple tooling and agent navigation.

```txt
stagecom/
  AGENTS.md
  README.md
  package.json
  vite.config.ts
  tsconfig.json
  src/
    routes/
    components/
    features/
    server/
    lib/
    styles/
  public/
  supabase/
    migrations/
    seed.sql
  docs/
    product/
    data/
    design/
    development/
    specs/
    rebuild/
    archive/
  wiki/
    _index.md
    product/
    data/
    architecture/
    design/
    features/
    decisions/
  scripts/
```

Use `npm`.

## Migration Strategy

- Copy existing Supabase migrations as baseline history.
- Do not squash migrations initially.
- Add reset schema changes as forward migrations.
- Keep the current database shape unless the reset exposes a specific mismatch.
- Maintain concise data docs and wiki pages so agents do not repeatedly inspect raw SQL.

## Docs Strategy

- Use curated migration, not a full copy.
- Rewrite stale Nuxt-specific architecture docs.
- Keep raw docs in `docs/`.
- Keep agent-facing synthesis in `wiki/`.
- Add reset plans under `docs/rebuild/`.

## Agent Instructions

Create a new `AGENTS.md`, not a copy of the current one. It should include TanStack Start, React, TypeScript, Supabase, API boundary, docs/wiki workflow, and no-commit-without-permission rules.
