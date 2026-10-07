# Callsheet hierarchy refinement

Status: implemented locally; maintainer acceptance pending. October 5, 2026.

The maintainer paused the broader neutral review after observing weak hierarchy,
repetitive explanation, and little guidance toward action. The agreed first pass
uses existing Callsheet data, with actions and agenda beside each other on desktop
and actions first on phone. Branding and additional query fields are deferred.

## What changed

- Personal responses and shared decisions appear under Needs your attention,
  with separate sections preserving their distinct authority and meaning.
- Confirmed Calls form a compact chronological agenda. Browsing follows both
  action sections; no Event or destination is removed.
- Page, section, and item headings have distinct visual weights. Repetitive
  descriptions and oversized cards are replaced by concise rows and action labels.
- Existing response handlers, authorization, and queries remain unchanged.
  Saving, failure, retry, empty states, and accessible action names remain available.

## Snapshot record

Unedited full-page captures use the same Morgan Member account and existing dev
dataset: zero personal responses, three shared decisions, one confirmed Call,
six relevant Events, and zero discoverable Events. Desktop is 1280 × 800;
phone is an emulated 390 × 844 viewport. Before captures are the hosted dev
application; later captures are the local implementation based on `32a2f83`.

| Stage            | Desktop                                                              | Phone                                                            |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Before           | [Before desktop](callsheet-hierarchy-evidence/01-before-desktop.jpg) | [Before phone](callsheet-hierarchy-evidence/01-before-phone.jpg) |
| Layout pass      | [Layout desktop](callsheet-hierarchy-evidence/02-layout-desktop.jpg) | [Layout phone](callsheet-hierarchy-evidence/02-layout-phone.jpg) |
| Final refinement | [Final desktop](callsheet-hierarchy-evidence/03-final-desktop.jpg)   | [Final phone](callsheet-hierarchy-evidence/03-final-phone.jpg)   |

Shared decisions move from approximately 1,500 px to 369 px down on desktop,
and from 2,090 px to 409 px on phone. Full-page height falls from approximately
2,480 to 1,638 px on desktop and 3,242 to 2,048 px on phone.
These measurements describe this dataset, not a usability acceptance decision.

## Verification and remaining limits

- Focused Callsheet component, read-model, and shared-work tests: 10 passed.
- Typecheck, production build, scoped ESLint, and whitespace checks passed.
- Desktop, phone, and intermediate 1024 px viewport checks found no horizontal
  overflow; keyboard navigation reaches the summary links with a visible focus outline.
- The confirmed Call link opens the authorized Event and occurrence anchor.
- No new local console errors were observed. The earlier hosted baseline emitted
  React hydration error 418; that existing warning is not resolved by this pass.
- Browser verification is read-only against shared remote dev. Response callbacks
  are covered by component tests; the mutating browser suite was not run against
  that shared dataset. Existing browser selectors were updated for the new composition.
- Real-phone input, exhaustive screen-reader testing, and uncoached user review
  remain pending.

The prior critique is retained at
`.impeccable/critique/2026-10-06T01-57-59Z__src-features-callsheet-components-tsx.md`.
This pass addresses ordering, density, and heading hierarchy. Distinguishing
same-title Events with richer summaries and explaining authority invitations with
additional consequence context remain deferred. Human review should assess
finding the next action and distinguishing responses, Calls, and shared decisions
before applying this pattern to other workspaces.

Preview: `http://localhost:3000/app/callsheet`. UI changes are not deployed.

## Second pass: task composition and plain language

The maintainer found the first pass better but still too weak in layout and
content. This pass replaces the sparse desktop columns with full-width decision
rows, followed by a compact Calls agenda. Actions sit beside their subjects on
desktop and below them on phone. Relevant Events use two columns on desktop.
Empty response and discovery sections retain brief status text and accessible
region names, without visible heading/count blocks. Zero-count action summary
links are omitted.

Known publication and Proposal review explanations are translated into
plain-language next steps in the Callsheet presentation only. Domain action labels
and the original urgency/deadline overrides are preserved. No new facts, query
fields, commands, or permission changes are introduced.

| Stage                | Desktop                                                                                                                                                  | Phone                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Task composition     | [Desktop](callsheet-hierarchy-evidence/04-task-layout-desktop.jpg)                                                                                       | [Phone](callsheet-hierarchy-evidence/04-task-layout-phone.jpg) |
| Confirmed refinement | [Upper viewport](callsheet-hierarchy-evidence/05-task-final-desktop.jpg), [lower viewport](callsheet-hierarchy-evidence/05-task-final-desktop-lower.jpg) | [Phone](callsheet-hierarchy-evidence/05-task-final-phone.jpg)  |

Desktop full-page capture did not paint all offscreen content reliably in this
browser, so the final desktop record uses separate viewport captures. The phone
capture remains full-page. The live dataset now has **two** shared decisions;
the earlier Proposal review is no longer returned. These captures therefore
record both presentation changes and the current data, not an identical-data
comparison. Phone width is 390 px without horizontal overflow.

The same 10 focused tests pass after updating the expected empty-state wording;
typecheck, scoped ESLint, and production build pass. The earlier verification
limits still apply. This pass supersedes the side-by-side layout recommendation;
maintainer acceptance remains pending.

## Third pass: persistent personal agenda

Confirmed Calls now follow the signed-in user across the private workspace.
Desktop shows the next three Calls under navigation, including Event, date/time,
and Theater. View all Calls opens the complete Callsheet agenda. Mobile shows
the next Call below the workspace header; tapping it opens a bottom sheet with
all upcoming Calls. Call links open the authorized Event occurrence anchor.
The dashboard keeps its full agenda as a secondary section.

The shell uses a dedicated feature query wrapping the existing authenticated,
active-membership-scoped Event commitments query. It excludes invitations,
undated entries, invalid dates, and past Calls. It remains personal across all
active Theaters rather than following the selected Theater. No schema,
permissions, or domain commands changed. Empty and failed reads have explicit
states; failed reads provide Retry Calls. The shell loader caches for 30 seconds
and refreshes on invalidation or a stale navigation; this is not a realtime feed.

Dates show the browser's local timezone explicitly. Server and initial hydration
use UTC consistently, then switch to local formatting after hydration. The live
Member dataset now has zero shared decisions and one confirmed Call, so earlier
dashboard screenshots are not identical-data comparisons.

| Capture                   | Record                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Initial desktop placement | [Desktop](callsheet-hierarchy-evidence/06-agenda-desktop.jpg)                                                                                  |
| Initial mobile placement  | [Strip](callsheet-hierarchy-evidence/06-agenda-phone.jpg), [sheet](callsheet-hierarchy-evidence/06-agenda-phone-sheet.jpg)                     |
| Final desktop             | [Callsheet](callsheet-hierarchy-evidence/07-agenda-final-desktop.jpg), [Calendar](callsheet-hierarchy-evidence/07-agenda-calendar-desktop.jpg) |
| Final mobile              | [Strip](callsheet-hierarchy-evidence/07-agenda-final-phone.jpg), [sheet](callsheet-hierarchy-evidence/07-agenda-final-phone-sheet.jpg)         |

Verification: 11 focused tests pass, including future-only personal Calls across
Theaters and chronological ordering. Typecheck, scoped ESLint, production build,
and whitespace checks pass. Read-only browser checks verify persistence on
Calendar and Event pages, the correct Call destination, no phone overflow, and
Escape dismissal with focus returned to the mobile strip. Existing full-suite,
physical-device, and human-acceptance limits remain. The shared dev dataset was
not seeded or mutated for these checks. Changes remain local.

## Fourth pass: remove redundant Theater listing

October 6, 2026: the maintainer requested removal of Your Theaters because
Theater context is already present in relevant content and the dropdown handles
selection. The dashboard no longer repeats memberships or the default badge.
Users without memberships retain the brief Create a Theater empty-state action.
The existing multi-Theater browser scenario now selects Harbor Stage through the
dropdown rather than the removed section. The three Callsheet component tests
pass; browser inspection confirms the heading is absent.

Snapshots: [desktop](callsheet-hierarchy-evidence/08-no-theater-section-desktop.jpg)
and [phone](callsheet-hierarchy-evidence/08-no-theater-section-phone.jpg).

## Fifth pass: Your Next Events

October 7, 2026: rename the personal sidebar to Your Next Events, with matching
mobile, empty-state, and error wording. Remove the three-entry sidebar limit;
the agenda now displays every upcoming scheduled Occurrence returned for the
user across active Theaters. Existing reads include required and optional Calls
for accepted Cast and Event staff, with confirmed times, regardless of whether
an Event has been published. They do not filter Rehearsals versus Performances.
The ordering test covers both Cast and Event staff relationships.

Scope limitation: the underlying commitments query filters `event_type = show`.
The product's current milestone supports performance Events with Rehearsal and
Performance Occurrences. Standalone meetings, workshops, auditions, and Practices
remain deferred, as recorded in `wiki/decisions/events-ui-shows-db.md`; this label
change does not implement those scheduling flows. Events without a personal Call
are relevant context, not confirmed personal attendance.

The focused agenda test, typecheck, ESLint, and whitespace checks pass. The local
server was restarted, but browser automation remained on a connection-error page
and blocked navigation, so no new verified screenshot was captured for this pass.

## Sixth pass: conditional dashboard and explicit Event context

October 7, 2026: hide empty personal responses, shared decisions, and confirmed
Calls rather than showing the permanent “You're up to date” block. Empty personal
agendas disappear on desktop and phone; failed agenda reads retain their retry
state. Empty discovery sections no longer render a contradictory global message.

“Relevant Events” was the union of operational Event workspaces and personal
participation relationships, including drafts and unscheduled Events. Rename it
“Your Event workspaces” and show each Event's actual relationship, lifecycle,
next confirmed date/time (with timezone), and accepted Cast names. This list
provides workspace context; it does not imply personal attendance. More Events
to explore appears only when published discovery results exist, with dates from
anonymous-safe snapshots.

The existing portfolio access check scopes operational reads to Theater
Operators, Reviewers, and Event leadership. Accepted Cast can also receive the
schedule and Cast roster, matching the Event workspace policy. Pending invitees
receive summaries only; Staff dates come from their own authorized Calls. No
Proposal details or extra roster access are granted. A query authorization test
checks accepted versus pending Cast and Staff, including excluding pending
Cast names from the returned roster.

Verification: 186 unit/component tests passed; three integration tests skipped.
Typecheck, scoped ESLint, and production build passed. Desktop and 390px phone
inspection confirmed conditional sections, readable dates and roster, long title
wrapping, and no horizontal overflow. Shared remote demo data was read, not
mutated. All four fixture-writing Callsheet E2E scenarios skipped because this workspace
uses remote Supabase; they remain gated on local Supabase.

Snapshots: [desktop](callsheet-hierarchy-evidence/10-event-workspaces-desktop.jpg)
and [phone](callsheet-hierarchy-evidence/10-event-workspaces-mobile.jpg).

## Seventh pass: compact Event rows and Cast avatars

October 7, 2026: replace visible Cast names with slightly overlapping profile
avatars and initials for missing photos. Full names appear in tooltips on hover,
keyboard focus, or tap. Up to five avatars are visible; a +N avatar reveals the
remaining names. The buttons sit outside the Event link so inspecting Cast does
not navigate away. Mobile controls retain 44px targets with overlapping visuals.

Combine lifecycle with Theater and relationship metadata. Keep schedule and
avatars together beneath the title, reduce typography and row spacing, and omit
empty Cast lines. Profile IDs and avatar URLs use the same accepted-Cast roster
query and authorization scope introduced in the sixth pass.

Focused component and authorization tests pass (five tests), including opening a
full-name tooltip. Typecheck and scoped ESLint pass. Browser inspection verifies
full names, compact rows, and a 390px phone layout without horizontal overflow.

Snapshots: [desktop tooltip](callsheet-hierarchy-evidence/11-compact-avatars-desktop.jpg)
and [phone tooltip](callsheet-hierarchy-evidence/11-compact-avatars-mobile.jpg).
