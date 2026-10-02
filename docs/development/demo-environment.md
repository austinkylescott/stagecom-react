# Demo Environment

Status: implemented

## Purpose

The Stagecom demo is a deterministic, disposable dataset for moderated user
testing, stakeholder walkthroughs, and manual QA. It must run against either
the local Supabase stack or a dedicated hosted demo project. Do not point the
demo commands at production or the shared development project, except for the
current maintainer-approved single-project arrangement below.

On 2026-10-02 the maintainer confirmed that `stagecom`
(`obufimjayisdhkjjxhfd`) is the personal project's only active database and
explicitly approved using it for the STA-71 demo seed and later the STA-72
migration and extended demo seed. Development and production
are not yet separate. This approved seed uses only the owned demo records;
future remote seed/reset operations still require explicit approval. Revisit
this exception when dedicated environments are introduced.

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

Availability review (STA-69) adds an alternative Candidate Slot to the owned
demo Events. In Cast & Team, the Producer can select Morgan Member and Parker
Producer for a two-option poll. The scoped reset explicitly clears owned poll
records before removing their Occurrences; it never clears unrelated polls.

Team review (STA-71) seeds **Ants 2 Gods** and **The Management** through
authenticated Team commands. Parker Producer owns both; Casey Multi-Theater
belongs to both, and Morgan Member belongs to Ants 2 Gods. These are accepted
Team memberships independent of their Event relationships. People supports
creating a Team as Morgan and inviting Parker to accept personally. Reset clears
only Teams belonging to the two owned demo Theaters before clearing membership.

STA-72 adds **Authority Review Team** with Parker, Morgan and Casey for the
consent/departure walkthrough. **The Management** gives Casey accepted Team
Admin authority and an accepted recovery nomination through authenticated
commands. Ants 2 Gods retains the original membership story. The automated
recovery scenario creates an isolated local Auth actor and persists their Theater
and Team membership before racing transfer acceptance with deactivation.
After explicit operation approval on 2026-10-02 these extensions were seeded on
`stagecom`. Remote persona authentication and Team reads verified all three
Teams, Casey's accepted Admin authority and accepted recovery nomination;
anonymous Team reads remain denied. Future remote seeds still require approval.

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

STA-73 adds **Team Cast Invitation Review** (`team-cast-review`) in Compass Rose.
Parker is explicitly accepted Cast, Casey has a pending Event invitation, and
Morgan is eligible through the overlapping accepted Teams. As Producer, select
Ants 2 Gods and The Management in Cast & Team, review the three unique names, and
send Morgan's invitation. Morgan can accept personally from Callsheet or the
Event. This extends only owned demo records; local seed execution is verified.
After explicit maintainer approval on 2026-10-02, the migration was verified on
`stagecom` and these owned demo records were reseeded. Authenticated Producer
review returned unique Casey (pending), Morgan (eligible), and Parker (accepted)
recipients; ordinary Member and anonymous Cast Team reads were denied. Future
remote migrations and reseeding still require explicit operation approval.

Public discovery review (STA-74) publishes **Calendar Performance** and **Public
Stories** in Compass Rose through the delivered public-content/publication RPCs,
then saves separate unpublished working revisions. The first has a complete
1080×1350 poster, free admission and no advance ticketing; the second has long
copy, an unavailable image and an external ticket link. Original Event identity
and snapshot Performance IDs connect to the authorized private destinations.
Owned public Occurrence snapshots are cleared before owned Events on reset.
Local seed reruns pass. After explicit maintainer approval on 2026-10-02, the
scoped STA-74 demo seed also succeeded on `stagecom`. Anonymous snapshots,
unpublished absence, private-table denial and Producer authority were verified.
Future remote seed/reset operations still require explicit approval.
