# Connected neutral workspace review (STA-75)

Status: integrated neutral review checkpoint ready for maintainer review; human presentation
review pending. This record does not approve branding or release readiness.

## Successive gates

1. **Neutral presentation review**: walk every page below with the maintainer,
   record accepted/revise/defer decisions and verify revisions before closing.
2. **Branding application**: begins only after explicit neutral presentation
   acceptance and a separately approved branding direction.
3. **Branded presentation review**: repeat the page-by-page review after branding.

Automated behavior and layout checks supply evidence; they do not constitute a
maintainer presentation decision. Actual-device software-keyboard observations
are a separate, still-pending review item; viewport emulation cannot establish them.

## Review approach agreed October 5, 2026

The maintainer confirmed these review-planning decisions through grill-with-docs:

- The outcome of this pass is readiness for branding. Theater pilot readiness
  requires additional operational and real-user evidence.
- The maintainer reviews first to settle page structure and obvious friction;
  a few uncoached users follow to test understanding without explanation.
- Start with a Member responding from Callsheet: find an outstanding response,
  open its Event, respond, and verify that the task clears while confirmed
  commitments remain visible.
- Review and repair one journey at a time. Record accepted, revised and deferred
  findings here and verify each repair before moving to the next journey.
- The maintainer operates the application while the agent captures findings,
  so navigation choices and friction remain observable.
- A journey is ready to move on when the maintainer can find and complete the
  task, explain what changed and what remains committed, and encounter no
  unresolved blocking problems on desktop or phone. Minor presentation issues
  may be explicitly deferred; unclear participation, commitment or authority
  requires revision.

These decisions establish the review approach, not acceptance of any page.
The review plan was confirmed. During the maintainer review, broad hierarchy and
repetitive-copy concerns prompted a pause in the page-by-page walkthrough.
The agreed Callsheet refinement uses existing data, with actions beside the
agenda on desktop and before it on phone. Implementation and successive
snapshots are recorded in [Callsheet hierarchy review](callsheet-hierarchy-review.md).
Maintainer acceptance of the refinement and subsequent journeys remains pending.

## Reproduce the connected review

Use the existing application and `docs/development/demo-environment.md`. Configure
only a disposable local Supabase target, enable server-side demo mode, run the
scoped `npm run demo:seed`, then run the app. Persona controls belong on `/login`,
outside the product canvas; each enters through Supabase Auth. Reseed between
mutating suites to restore the shared Compass Rose and Harbor Stage story.
Never reseed shared remote dev or apply remote migrations without approval for
that operation. No new schema or backend contract is required for this checkpoint.

Start with Callsheet as Morgan Member, follow the named Theater to its portal,
portfolio and Calendar, open an authorized Event and return to the same period.
Visit People, search overlapping Teams, open Notifications and Account, and
return to Callsheet. Repeat as Parker Producer (independent Producer, Director
and accepted Cast), Olivia Owner/Avery Admin, Casey Multi-Theater and Indigo
Invitee. Inspect the same Event's restricted invitation presentation. Finally
sign out and discover the published Theater and Event snapshots. Compare the
published presentation with Parker's separate current private working copy.

## Page-by-page maintainer checklist

Decision values: **Pending**, **Accepted**, **Revise**, **Deferred**. Only a human
review decision may change Pending to Accepted. A revised finding stays open
until its verification and subsequent human decision are recorded.

| Page / presentation                     | Maintainer inspection                                                            | Decision | Finding / follow-up             |
| --------------------------------------- | -------------------------------------------------------------------------------- | -------- | ------------------------------- |
| Login / persona controls                | Real Auth, general entry, deep-link return, chooser outside canvas               | Pending  |                                 |
| Desktop shell                           | Callsheet, Calendar, named Theater, People; scope and bottom controls            | Pending  |                                 |
| Phone shell                             | Drawer, Escape/focus return, top-right controls, touch targets                   | Pending  |                                 |
| Callsheet Member                        | Response needed beside retained Calls; relevant Events and discovery             | Pending  |                                 |
| Callsheet multi-role / multi-Theater    | Relationship labels, mixed Theater names, personal/shared/watch-only separation  | Pending  |                                 |
| Theater portal / Operations             | Programming and community entrances, authorized decisions and exceptions         | Pending  |                                 |
| Event portfolio                         | Unscheduled long-title Event, filters, independent states, empty results         | Pending  |                                 |
| Theater Calendar                        | Daybook/month, period controls, opaque occupancy, touch/keyboard details         | Pending  |                                 |
| Event Overview                          | Shared identity, chronological Occurrences, selected Occurrence and Back context | Pending  |                                 |
| Schedule & Plan / Cast & Team           | Poll comparison, draft/submission, planning/confirmation/booking distinctions    | Pending  |                                 |
| Review                                  | Exact immutable revision, eligible decisions, authorship/stale restrictions      | Pending  |                                 |
| Pending invitee Event                   | Individual acceptance context, absence of accepted-Cast planning/polls           | Pending  |                                 |
| People / Teams                          | Search, full names, overlapping labels, invitation consent and authority         | Pending  |                                 |
| Notifications                           | Read/dismiss history, retry, domain tasks remain unchanged                       | Pending  |                                 |
| Account                                 | Meaningful identity, keyboard menu and sign-out                                  | Pending  |                                 |
| Public discovery / Theater              | Anonymous-safe published programming, no private Event copy                      | Pending  |                                 |
| Public Event                            | Full poster, readable dates/location/admission, long copy and missing image      | Pending  |                                 |
| Loading / empty / validation / disabled | Understandable progress, no invented content, recoverable form input             | Pending  |                                 |
| Error / permission loss / stale state   | Retry or authorized return, rejected writes preserve input                       | Pending  |                                 |
| Actual phone software keyboard          | Record device/OS/browser, input occlusion, scrolling and submit reachability     | Pending  | Not tested on physical hardware |

## Human review log

No STA-75 presentation decisions have been supplied yet. Record each observation
here as review occurs; do not infer acceptance from tests or prior ticket merges.

| Date / reviewer | Page / width / device    | Finding                          | Accepted / revise / deferred | Verification / next step   |
| --------------- | ------------------------ | -------------------------------- | ---------------------------- | -------------------------- |
| Pending         | All representative pages | Neutral presentation walkthrough | Pending                      | Maintainer review required |

## Automated findings and verification

Failures, omissions and untested states remain explicit even where scoped
checks pass.

### Scope and contracts

The checkout starts at `aa3bbbc` (latest fetched `origin/main` at review start).
The connected remote dev migration list and the disposable local stack both end
at `20261002204819_public_event_occurrence_context`. Read-only comparison of the
six neutral-foundation migration bodies matches the tracked SQL: four byte-for-byte;
the poll and reviewed-Cast migrations match after restoring the statement
terminators omitted from the stored statement array and normalizing whitespace.
Generated local public-schema types match the committed contract after accounting
for the CLI's omitted `__InternalSupabase.PostgrestVersion` metadata.

No schema, seed script, route, Auth, query, command, transactional or domain-event
contract changes are part of STA-75. Existing anonymous-safe public queries and
private authorization remain separate. No remote write operation was performed.

### Integration fixes

- Notification read/dismiss actions now catch transport exceptions, announce
  retry feedback and re-enable the action while retaining the current alert.
  Retry persists through the existing command; dismissal never accepts the
  underlying Cast invitation. A dropped POST first reproduced the missing alert
  before the fix; the real-session browser regression verifies recovery.
- Theater settings navigation places each React key on the mapped Button,
  eliminating the list-key warning without changing navigation behavior.
- Existing browser journeys now enter the separate Operations destination,
  use semantic article roles, scope Proposed Cast checkboxes away from poll
  respondents, use Daybook and readable health labels, and wait for the
  planning action to hydrate before inducing permission loss. A designated
  Reviewer checks their Callsheet decision; designation grants no Operator access.
- Responsive overflow checks wait for layout to settle after changing viewport.
  An initial transient public-Theater width failure did not reproduce on the
  settled page or connected rerun. No speculative presentation fix was applied.

### State and interaction coverage

| Scenario                              | Existing-application evidence                                                                                                                                                                              | Limits                                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Loading and failed read/retry         | `public-programming.spec.ts` delays/interrupts the public read and retries; `theater-calendar.spec.ts` retries the private read                                                                            | Network interception supplies the failure, successful reads use real queries     |
| Empty and long content                | Calendar 2035 empty periods; People missing search; long-title unscheduled portfolio Event and long published copy                                                                                         | Not an exhaustive content-length stress test                                     |
| Validation and disabled actions       | Poll requires every answer; closed poll controls disabled; Team name/recipient validation; required planning confirmation blocks submission                                                                | Feature-specific conditions, not every possible form error                       |
| Recoverable transport and stale input | Poll private draft/reload, offline retry, second-tab conflict and closure; Team input/retry; planning confirmation retry; Notification read/dismiss retry                                                  | Does not certify every legacy form's transport handling                          |
| Permission loss and authorization     | Planning stale participant withdrawal; Theater Member deactivation and retained history; Team authority races; pending invitee poll denial; unrelated private-route denial; anonymous private-table denial | Local Auth/database evidence, no remote mutating verification                    |
| Real persistence                      | Individual Team/Cast acceptance, poll drafts/submissions, planning approval/atomic replacement, Notification attention state all survive real rereads/reloads                                              | Existing feature suites retain their own isolated fixtures                       |
| Keyboard, dialogs and touch           | Connected account/drawer keyboard open and Escape focus return; Team authority dialogs; Calendar touch quick details and keyboard activation; poll keyboard responses                                      | Emulation; physical software keyboard remains untested                           |
| Names, focus and state cues           | Visible Member names, role/health/hold labels, labelled controls and stock focus-ring primitives; screenshots inspected separately                                                                         | Automated checks and agent inspection do not establish uncoached human usability |

### Verification record

- Initial full browser baseline: **33 passed, 11 failed, 1 skipped**. Failures
  included obsolete compositions/selectors and the stale-planning hydration race.
- Focused final connected/publication/governance/Proposal review run: **9 passed**.
- Typecheck and production build: **passed**.
- Full unit/integration suite: **59 files, 186 tests passed**, including real
  anonymous queries and authenticated local scope checks.
- Scoped ESLint and Git whitespace checks: **passed**.
- Intermediate full runs: **43 passed, 3 failed, 1 skipped**, then **44 passed,
  2 failed, 1 skipped**. The connected journey needed an exact Event-route/heading
  assertion; legacy milestone links and Team form checks needed hydration waits.
  The corrected milestone passed three consecutive runs and the Team flow passed.
- Subsequent full run: **42 passed, 4 failed, 1 skipped**. Persona login and an
  immediate Callsheet load competed; the journey now follows the hydrated shell
  link and both connected/Notification tests pass on rerun. One exhausted Join
  Link read returned an external-service error; its unchanged focused rerun passed.
  Team authority tests encountered retained mutation state and duplicate recovery
  Teams after repeated runs. The owned disposable demo story was reseeded.
- Final fresh-seed serial full browser suite: **45 passed, 1 failed, 1 skipped**.
  Connected review, Notification recovery, Team authority, Join Links and Calendar
  passed. The older Callsheet drawer-focus test interacted before its route
  transition settled; it now waits for the Callsheet URL and hydrated trigger.
  The affected test then **passed three consecutive runs**. The full suite was
  not repeated after this test-only synchronization fix.
- Skipped completion-fault injection is restricted to the default disposable
  local stack; this run uses the dedicated demo stack. No remote fault injection
  or production operation was attempted.
- No migration or seed-code change: migration/reset/pgTAP checks were not rerun;
  read-only migration-body comparison, generated-type comparison and real
  authorized persistence/query journeys provide proportionate database evidence.
- Physical-device software keyboard, uncoached human usability, exhaustive screen
  reader audit and branded presentation: **not performed**.
- Neutral presentation checklist and human review log above remain **Pending**.

## Code review against `aa3bbbc`

### Standards

No documented-standard violations or material baseline smells. Production fixes
remain in feature components and reuse authorized commands. Tests use real local
Auth and persistence; docs and wiki remain synchronized. The final login
synchronization deltas were also reviewed without findings.

### Spec

No actionable gaps or scope creep. The connected pages/personas, retry behavior
and preserved contracts match STA-75. Human acceptance and actual-device review
remain explicit limits. The final full-run failure and focused recovery results are recorded above.

Standards: **0 findings**, no worst issue. Spec: **0 findings**, no worst issue.
