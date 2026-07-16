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
npm run db:start:local
npm run db:status:local
npm run db:reset:local
npm run db:migrate:local
npm run db:test:local
npm run db:types:check:local
npm run db:types:local
npm run db:seed
npm run db:stop:local
```

## Local Runtime And Logged-In Testing

Prerequisites:

- Docker Desktop (or another Docker-compatible daemon) is installed and running.
- Node.js and the repository dependencies are installed with `npm install`.
- Ports `54320` through `54324`, `54327`, `8083`, and `3000` are available.

Start Supabase and rebuild the database from the complete migration chain:

```bash
npm run db:start:local
npm run db:reset:local
npm run db:test:local
npm run db:types:check:local
```

`db:reset:local` starts from an empty local database, applies every tracked
migration in timestamp order, and leaves the intentionally empty seed file in
place. The database acceptance suite verifies the STA-6 transactions, retry
behavior, default-Theater invariant, Publication rules, durable events, and
anonymous visibility. `db:types:check:local` fails when the generated local
types differ from the committed schema types.

Run `npm run db:status:local` and copy its API URL, anon key, service-role key,
and database URL into `.env.local` using these names:

```txt
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service-role key>
SUPABASE_DB_URL=<local database URL>
VITE_APP_URL=http://localhost:3000
```

Then run `npm run dev`, open `http://localhost:3000/signup`, and request a
magic link for any local email address. Open the local mailbox at
`http://127.0.0.1:54324`, select the message, and follow its link. Local email
confirmation is disabled, so the callback creates a server session immediately
and the protected `/app` routes can be exercised as a logged-in Member.

If the callback is rejected, confirm the app is running on port `3000` and the
browser URL uses either `localhost` or `127.0.0.1`; both callback origins are
allow-listed in `supabase/config.toml`. If services or migrations become stale,
run `npm run db:stop:local`, start again, and reset the database.

## Migration Discipline

Create schema changes as forward migrations under `supabase/migrations/`.

Recommended order for schema work:

1. Create or edit a forward migration.
2. Apply and test it locally with `npm run db:reset:local` or `npm run db:migrate:local`.
3. Push it to the linked remote dev project with `npm run db:migrate:remote`.
4. Regenerate committed database types from remote with `npm run db:types`.
5. Update `docs/` and `wiki/` when behavior, schema, roles, or permissions change.

Do not use local schema as the implicit source of truth after a remote migration has landed.
