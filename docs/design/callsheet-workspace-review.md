# Callsheet workspace foundation (STA-66)

Status: implemented, awaiting neutral presentation review

The existing authenticated TanStack Start application now uses a neutral
sidebar on desktop and a left navigation drawer on phones. Its order is
Callsheet, the selected Theater's Calendar, the named Theater, and People.
Notifications and Account sit at the desktop bottom and phone top right.
Theater switching retains Calendar or People context; Event destinations keep
their existing authorized deep links. The legacy personal Calendar remains
reachable by its existing URL but is not a destination in this shell.

Callsheet separates Response needed, Confirmed Calls (ordered by time), Relevant
Events, published Event discovery, shared Work Queue decisions, and Theater
entry points. Every mixed item identifies its Theater. Relevant Events reuse
existing authorized Event Portfolio summaries, including relationships without
an outstanding action. Discovery uses the anonymous-safe published Theater Event
query and public destinations. No private operational fields are added to
Callsheet Event cards.

Inline Admin, ownership and staff responses use the existing commands. Success
removes the personal task and invalidates route data; confirmed Calls remain.
Failures keep the response available and display retry feedback. Event-specific
responses continue through existing Event destinations. Notifications remain a
separate personal inbox whose dismissal does not resolve domain work.

The neutral styles use the [shadcn/ui default Neutral light tokens](https://ui.shadcn.com/docs/theming),
including input, focus, secondary, destructive, chart and sidebar tokens, with
system sans typography. Legacy feature variables alias those semantic tokens
so the existing compositions share the same baseline. The styles are scoped
to the authenticated workspace and its portaled controls. Public pages,
Supabase Auth, callback behavior, database schema, authorization and Notification
projection contracts retain their existing implementations. This delivery does
not constitute branding approval or page-by-page human presentation approval.

## Review data and evidence

Run `npm run demo:seed` against local Supabase to restore Compass Rose Players
and Harbor Stage. Sign in from the development-only chooser on `/login` as
Member, Multi-Theater Member, Owner or Admin. Member has one Theater; the
multi-Theater persona has Calls in both and an Admin Invitation at Harbor Stage.
Owner/Admin provide Operator review. Product pages contain no persona controls.
The seed can run repeatedly, deleting only the two named demo Theaters and
preserving/updating demo Auth users. The leadership reset ordering accommodates
the existing Event risk trigger without changing the schema.

The browser acceptance file is `e2e/callsheet-workspace.spec.ts`. Its disposable
fixture runs only against local Supabase, authenticates a real Member, dismisses
a Notification, verifies the action remains, accepts the Admin Invitation,
reloads to verify persistence, checks the retained Call, switches Theater, and
checks keyboard drawer focus and page width at 360px and 390px. Separate seeded
Member, multi-Theater and Operator journeys exercise login and People navigation.
Viewport emulation does not establish actual-device software keyboard behavior.

Existing read-model, component and authorization tests are retained; the
publication browser journey uses the new Response needed section name.

## Recorded verification

- Typecheck and production build passed.
- Full unit/integration suite: 52 files, 170 tests passed. Following review
  adjustments, the seven affected Callsheet/Portfolio/Auth/public-read test
  files passed all 19 tests.
- Final workspace and publication browser run: five journeys passed. The
  existing Cast invitation/disclosure browser journey also passed.
- Scoped ESLint checks passed. The local demo seed passed twice, confirming
  reset/rerun behavior. Desktop and phone screenshots were visually inspected.
- The browser regression initially confirmed Harbor entry reset Calendar to
  Compass Rose. Recording route-derived Theater context fixed it; the final
  journey retains Harbor after returning to Callsheet.
- The publication journey now waits for its Public Page navigation handler
  after reload, following the existing hydration synchronization convention.
- The full browser suite, remote data mutations, actual-device keyboard tests,
  and uncoached human presentation review were not performed for this slice.

## Standards

Review of the ticket diff against user-selected base `f42da33` found no hard
violations and initially identified two judgment calls: URL-derived Event
classification and duplicated browser hydration waits. Explicit authorized
workspace Event IDs and one hydration helper resolved both. Follow-up review
reported zero remaining standards findings.

## Spec

Review initially found one P2: active Theater scope could reset after entering
from a Callsheet card. Route-derived selection retention and a real browser
regression resolved it. Follow-up review reported zero remaining spec findings.

### Default-token follow-up

At the maintainer's request, the workspace adopts the documented shadcn/ui
Neutral light token set as a fresh baseline. `components.json` now selects
`neutral` for future component generation. System sans typography and semantic
aliases remove the remaining inherited accent choices from workspace
compositions. Typecheck, production build, and all four database-backed
workspace browser journeys passed after this change; updated phone screenshots
were visually inspected. Both review axes reported zero findings.
