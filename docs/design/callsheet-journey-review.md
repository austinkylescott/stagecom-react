# Integrated Callsheet journey (STA-81)

The approved contract is [STA-76](../specs/callsheet-commitment-clarity.md).
STA-77–80 supply invitation responsibility, personal Call meaning, distinct
Event destinations and read recovery. This integration retains the accepted
personal-first hierarchy, conditional sections, Theater dropdown, Your Next
Events, compact Event rows and independent Cast-name controls.

## Review journey

`e2e/callsheet-journey.spec.ts` defines the real local Supabase journey below.
It is authored but **not executed** in this session: the maintainer requested
skipping database setup and verification after the startup difficulties.
When enabled with disposable local credentials, it enters Callsheet through
visible workspace navigation at 1280px and 390px:

1. Read a pending Staff responsibility and expand its recorded inviter/time
   using the keyboard. No response occurs merely from viewing the offer.
2. Inspect existing Required Rehearsal and Optional Performance Calls with an
   explicit browser timezone. Accept the Staff assignment explicitly.
3. Reload and verify the response disappeared while every existing Call
   destination remains. Acceptance adds Staff responsibility, not new Calls.
4. Distinguish two long, identically titled Events within one Theater by their
   accessible names and open each using the keyboard. Inspect Cast names without
   navigating; dismiss with Escape and, on phone, tap outside. Open the phone
   agenda and compare its first Call time with the dashboard.
5. Fail only the browser's full Callsheet read at the app-owned boundary. Follow
   the alternate Notifications destination, return through navigation, then retry
   another transient failure into real authenticated Callsheet data. Existing
   Calls and the resolved response remain correct.

The fixture matrix includes authenticated active-membership role assertions.
Those assertions have not run here. The fixtures do not infer authority from a
persona's display name:

| Fixture              | Active memberships          | Authority and participation                             |
| -------------------- | --------------------------- | ------------------------------------------------------- |
| Ordinary Member      | North Stage only            | Member; explicitly accepted Cast                        |
| Multi-Theater Member | North Stage and South Stage | Member in both; North Cast and South Staff              |
| Mixed Operator/Cast  | North Stage and South Stage | Owner in both; explicit North Cast membership and Calls |

The mixed fixture is never reported as an ordinary-Member result. The existing
invitation scenarios independently cover Admin/ownership/Staff accept and decline,
stale responses and pre-acceptance redaction. Personal Call scenarios cover both
browser timezones and UTC server rendering; Event-link scenarios include a
remaining-Cast disclosure; recovery scenarios distinguish forbidden,
unauthenticated, empty and unavailable outcomes.

## Evidence and acceptance

When executed, the integrated suite saves `before` (reviewed invitation, before response) and
`after` (persisted response) snapshots for each persona and viewport under
`callsheet-journey-evidence/`. These show a state transition on the integrated
implementation. **No new integrated snapshots were captured in this session.**
Historical pre-feature visual baselines remain in the individual
[invitation](callsheet-invitation-review.md), [Call](personal-call-review.md),
[Event-link](event-link-review.md) and [recovery](callsheet-recovery-review.md)
records. They are not relabeled as newly captured evidence.

Maintainer acceptance is pending. Uncoached-user, physical-device, branding,
pilot and release approval remain separate; desktop browser phone emulation
does not establish those outcomes. No portal, navigation architecture, branding,
permission or schema change is part of this ticket.

## Local execution setup

The managed environment uses Docker's `vfs` storage driver on a 32 GB disk.
Unpacking the official Postgres image's original layers exhausted that disk;
registry downloads also encountered transient rate limits. The same official
`public.ecr.aws/supabase/postgres:17.6.1.143` filesystem was exported using
`crane export` and imported as one local Docker layer, preserving its Env,
Entrypoint, Cmd, WorkingDir, User, StopSignal and exposed ports. This changes the
local image digest and storage layout, not the database schema or application
code. The attempt excluded optional runtime services and replayed the existing
migration chain into a disposable local database. No new migration was authored.
Before Auth/API readiness and authenticated checks, the maintainer requested
skipping further database work; the local containers were stopped. No shared
remote database was seeded or changed, and no credentials were committed.

## Executed verification and remaining limits

- Typecheck, scoped ESLint, changed-file Prettier and production build passed.
- Full Vitest baseline: **199 passed, 6 skipped**. The skips require local
  Supabase or the optional seeded demo dataset; they are not passing query tests.
- Recovery browser suite: **7 passed** at the app-owned read boundary, including
  desktop/phone retry, repeated failure, independent agenda recovery, pending,
  empty, unauthenticated, forbidden and alternate navigation outcomes.
- The initial recovery run exposed a stale pending-state assertion and a cold
  development-server hydration timeout. The test now observes the router's
  actual **Preparing your Callsheet** pending surface, without a second retry
  control, and allows 15 seconds for first-load hydration. The full seven-scenario
  rerun passed. The recovery behavior record is updated to match.
- Standards review: **0 actionable findings**. Spec review: **1 finding,
  resolved** by comparing retained Call destinations after injected recovery,
  rather than only comparing their count.
- Authenticated integrated scenarios, local query suites, new before/after
  captures and the wider database-backed browser suite remain **unverified**.
  The maintainer explicitly requested skipping further Supabase work in this
  session. The six new persona/viewport scenarios are available for a later
  local run; this record does not claim they pass.

The accepted hierarchy and four slices are already integrated on main. This
ticket adds their combined test and review handoff; it changes no application
components, schema, authorization, navigation or branding. Maintainer review can
assess that source and the executed recovery evidence while keeping the deferred
authenticated journey and visual captures visible as remaining commitments.
