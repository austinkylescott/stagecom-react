# Database Workflow

Status: active rebuild workflow

## Default Target

The shared remote Supabase dev project is the default source of truth for app integration, schema verification, and generated TypeScript database types.

Local Supabase remains supported for isolated development, resets, experiments, and seed work. Local commands are named with `:local` and should be chosen explicitly.

## Codex And MCP Target

Codex Supabase MCP should point at the hosted Supabase MCP endpoint scoped to the remote dev project:

```txt
https://mcp.supabase.com/mcp?project_ref=<remote-project-ref>
```

Use `read_only=true` when inspecting the remote database without intending to apply changes:

```txt
https://mcp.supabase.com/mcp?project_ref=<remote-project-ref>&read_only=true
```

Use local MCP only when intentionally working against the local Supabase stack:

```txt
http://localhost:54321/mcp
```

## Environment Files

For normal rebuild work, `.env.local` should contain the shared remote dev values:

```txt
VITE_SUPABASE_URL=https://<remote-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<remote anon key>
SUPABASE_SERVICE_ROLE_KEY=<remote service role key>
SUPABASE_DB_URL=<remote database url>
SUPABASE_PROJECT_ID=<remote-project-ref>
```

For local-only development, temporarily replace those values with the output from:

```bash
npx supabase start
```

The default local API URL is:

```txt
http://127.0.0.1:54321
```

## Commands

Remote-first commands:

```bash
npm run db:link:remote
npm run db:migrate:remote
npm run db:types
npm run db:types:remote
```

Local-only commands:

```bash
npm run db:reset:local
npm run db:migrate:local
npm run db:types:local
npm run db:seed
```

## Migration Discipline

Create schema changes as forward migrations under `supabase/migrations/`.

Recommended order for schema work:

1. Create or edit a forward migration.
2. Apply and test it locally with `npm run db:reset:local` or `npm run db:migrate:local`.
3. Push it to the linked remote dev project with `npm run db:migrate:remote`.
4. Regenerate committed database types from remote with `npm run db:types`.
5. Update `docs/` and `wiki/` when behavior, schema, roles, or permissions change.

Do not use local schema as the implicit source of truth after a remote migration has landed.
