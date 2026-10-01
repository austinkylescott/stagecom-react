# Demo Environment

Status: implemented

## Purpose

The Stagecom demo is a deterministic, disposable dataset for moderated user
testing, stakeholder walkthroughs, and manual QA. It must run against either
the local Supabase stack or a dedicated hosted demo project. Do not point the
demo commands at production or the shared development project.

Agents may extend the demo seed and persona scenarios as feature work requires.
Use the existing Supabase schema and Auth workflow, and create required schema
extensions through forward migrations. Keep resets limited to explicitly owned
demo records and verify reruns remain deterministic. This authorizes seed-code
changes; executing remote seeds still requires approval for the target operation.

## Seeded Story

The seed creates the published **Compass Rose Players** Theater, a draft Event
for **A Midsummer Night's Dream**, explicit leadership and cast assignments,
and active, expired, exhausted, and revoked Reusable Join Links. It also creates
**Harbor Stage**, confirmed Calls for Members, and pending Admin Invitations
for response-clearing review. The Multi-Theater Member has Calls in both
Theaters; the base Member belongs only to Compass Rose. Owner, Admin, Member
and Multi-Theater Member enter through Callsheet. Persona controls remain on
the development-only login chooser, outside authenticated product pages.

Seven personas are available:

- Theater Owner
- Theater Admin
- Event Producer
- Theater Member
- Multi-Theater Member
- Pending Cast invitee
- Newcomer without Theater membership

The login page displays a persona chooser only when server-side demo mode is
enabled. The Newcomer lands on the active Join Link; other personas land in the
workspace most relevant to their role.

The Producer has independent Producer, Director and accepted Cast relationships.
The Pending Cast invitee can decide an invitation without seeing planning or
Calls. An additional long-title Event has no dates, for unscheduled portfolio
review. These STA-67 scenarios use the same persisted Auth and database workflow.

Calendar review (STA-68) additionally seeds a Primary Venue Performance on the
10th, an active Counteroffer hold on the 12th and a private Schedule Block on the
14th of the seed month. The Owner and Producer can inspect authorized Event
entries; unrelated Members see opaque venue occupancy. Existing offsite
Confirmed Slots do not consume the Primary Venue. These persisted scenarios
remain confined to the owned demo Theater and use the existing schema.

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
`npm run demo:seed` again resets only the Compass Rose and Harbor Stage Theaters and restores its
known state while preserving and updating the seven demo Auth users.

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
- Resetting targets only the `compass-rose` Theater slug and the seven exact
  `@demo.stagecom.test` Auth users.
- Normal magic-link login remains available for testing the real auth journey.
