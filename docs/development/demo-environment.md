# Demo Environment

Status: implemented

## Purpose

The Stagecom demo is a deterministic, disposable dataset for moderated user
testing, stakeholder walkthroughs, and manual QA. It must run against either
the local Supabase stack or a dedicated hosted demo project. Do not point the
demo commands at production or the shared development project.

## Seeded Story

The seed creates the published **Compass Rose Players** Theater, a draft Event
for **A Midsummer Night's Dream**, explicit leadership and cast assignments,
and active, expired, exhausted, and revoked Reusable Join Links.

Five personas are available:

- Theater Owner
- Theater Admin
- Event Producer
- Theater Member
- Newcomer without Theater membership

The login page displays a persona chooser only when server-side demo mode is
enabled. The Newcomer lands on the active Join Link; other personas land in the
workspace most relevant to their role.

## Local Setup

Start and rebuild local Supabase:

```bash
npm run db:start:local
npm run db:reset:local
```

Copy the values from `npm run db:status:local` into `.env.local`, then add:

```txt
VITE_APP_URL=http://localhost:3000
STAGECOM_DEMO_MODE=true
STAGECOM_DEMO_PASSWORD=<at-least-12-character-demo-password>
```

Seed and run the application:

```bash
npm run demo:seed
npm run dev
```

Open `http://localhost:3000/login` and choose a persona. Running
`npm run demo:seed` again resets only the Compass Rose Theater and restores its
known state while preserving and updating the five demo Auth users.

Remove all exact-target demo data with:

```bash
npm run demo:reset
```

## Hosted Demo

Create a dedicated Supabase project and a deployment configured with that
project's URL, anon key, and service-role key. Set the same demo-mode and
password variables on both the deployment and the machine running the seed.

The script refuses remote Supabase hosts by default. After verifying that the
environment is the dedicated demo project, seed it explicitly:

```bash
npm run demo:seed:remote
```

Reseed between sessions whenever a pristine story is important. The script's
remote opt-in is a safety boundary, not permission to run it against another
environment.

## Safety Boundaries

- Persona access is rejected server-side unless `STAGECOM_DEMO_MODE=true`.
- The demo password remains server-only and is never sent to the browser.
- Resetting targets only the `compass-rose` Theater slug and the five exact
  `@demo.stagecom.test` Auth users.
- Normal magic-link login remains available for testing the real auth journey.
