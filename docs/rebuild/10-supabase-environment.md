# Supabase Environment Strategy

Status: active rebuild plan

## Summary

Use the existing remote Supabase dev project first, while keeping local Supabase reproducible from day one.

This document is now implemented as the baseline for rebuild environment setup.

## Project Target

- Primary target: existing remote dev Supabase project.
- Local Supabase support exists but is not the first integration target.
- Add reset changes as forward migrations against copied baseline history.

## Env Files

Use:

```txt
.env.example
.env.local
```

Commit examples only. Never commit real `.env.local`, service-role keys, or secrets.

Tracked example vars:

```txt
VITE_APP_TITLE
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_APP_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DB_URL
SUPABASE_PROJECT_ID
```

`SUPABASE_PROJECT_ID` is optional and exists for CLI linking/type-generation notes. Runtime env is validated with `src/server/env.ts`; blank optional values are treated as unset so a copied `.env.example` does not fail before Supabase is configured.

Local `.env.local` for Supabase CLI should use the API URL and keys printed by `supabase start`. The default local API URL is:

```txt
VITE_SUPABASE_URL=http://127.0.0.1:54321
```

## Migrations And Types

Implemented scripts:

```txt
npm run db:types
npm run db:types:remote
npm run db:types:local
npm run db:link:remote
npm run db:reset:local
npm run db:migrate:local
npm run db:migrate:remote
npm run db:seed
```

Generate and commit DB types to `src/server/db/database.types.ts`.

Remote migrations target the linked remote dev project via `npm run db:migrate:remote`. `npm run db:types` is remote-first and aliases `npm run db:types:remote`; use `npm run db:types:local` only when intentionally generating from the local stack. Local migrations target the local Supabase stack via `npm run db:migrate:local`; use `npm run db:reset:local` when the local database should be rebuilt from migrations and seed.

Codex Supabase MCP should point at the hosted remote endpoint scoped to the dev project:

```txt
https://mcp.supabase.com/mcp?project_ref=<remote-project-ref>
```

Use local MCP (`http://localhost:54321/mcp`) only when intentionally inspecting or mutating the local Supabase stack.

See `docs/development/database-workflow.md` for the active workflow.

## Storage

Create public bucket:

```txt
theater-assets
```

Uploads go through app commands. Storage paths should be theater-scoped.

The bucket is defined in both local Supabase config and forward migrations:

- `supabase/config.toml`
- `supabase/migrations/20260505110000_create_theater_assets_bucket.sql`

The current baseline allows public reads for `theater-assets`. Writes must go through app-owned commands with explicit app-level authorization.

## Seed Data

Use deterministic seed scripts for tests, `/dev/components`, and manual QA.

`supabase/seed.sql` is intentionally empty for now so `npm run db:seed` stays stable without inventing auth-user seed data before that workflow is formalized.

## Auth Email

Use remote Supabase email behavior first. Document local email capture for local Supabase.

Local Supabase captures auth emails with Inbucket at:

```txt
http://127.0.0.1:54324
```
