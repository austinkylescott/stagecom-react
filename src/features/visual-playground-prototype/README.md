# Focus Theater visual playground — throwaway

Question: which visual system makes the Theater feel like a credible place to
return while supporting real Member and Operator work on phones?

Archive status: the maintainer reviewed these surfaces and selected A's sidebar
structure, neutral shadcn composition, the Availability poll direction and
self-service Teams. Final branding is deferred. This branch preserves the
runnable throwaway evidence; production implementation follows independent spec
review and issue creation.

The canonical consolidated review specification and independent-review handoff
are on `main` under `docs/specs/`. This branch's draft spec and some earlier
walkthrough/token notes are historical. September 30 refinement and round 2
notes below supersede earlier statements about outstanding human selection.
Do not merge this prototype implementation into `main`.

## Run and review

From `/Users/akscott/orca/workspaces/stagecom-react/visual-playground`:

```sh
npm run prototype:visual-playground
```

The running development server is at http://localhost:3100/dev/visual-playground.
No login, environment credentials, Supabase, or database is required. The route
renders a development-only notice in production. Scoped styles do not replace
production tokens. The root shell only omits PublicNav for this exact route.

Review links (use `variant=B` or `variant=C` to compare the same state):

- [Theater portal](http://localhost:3100/dev/visual-playground?variant=A&screen=portal&scenario=member)
- [Pending invitation](http://localhost:3100/dev/visual-playground?variant=A&screen=callsheet&scenario=pending)
- [Operator Calendar](http://localhost:3100/dev/visual-playground?variant=A&screen=calendar&scenario=operator-cast)
- [Dense month](http://localhost:3100/dev/visual-playground?variant=A&screen=calendar&calendar=month&scenario=operator-cast)
- [Eligible exact-revision review](http://localhost:3100/dev/visual-playground?variant=A&screen=review&scenario=reviewer&event=atlas)
- [Public Event](http://localhost:3100/dev/visual-playground?variant=A&screen=event&scenario=public&event=afterlight)
- [Approved / unpublished](http://localhost:3100/dev/visual-playground?variant=A&screen=event&scenario=approved-unpublished&event=atlas)
- [Published / At Risk](http://localhost:3100/dev/visual-playground?variant=A&screen=event&scenario=published-at-risk&event=room)
- [Unscheduled draft](http://localhost:3100/dev/visual-playground?variant=A&screen=event&scenario=draft&event=draft)
- [Three-canvas overview](http://localhost:3100/dev/visual-playground?variant=A&screen=portal&scenario=member&viewport=compare)
- [Component inventory](http://localhost:3100/dev/visual-playground?variant=A&screen=components)
- [Secondary membership](http://localhost:3100/dev/visual-playground?variant=A&screen=callsheet&scenario=multi)

Lab controls are outside the product canvas. Screen, scenario, Event, Occurrence,
section, Calendar mode, viewport, direction, and Theater are URL state. Actions
are in memory; reload starts fresh. Direction changes preserve actions. Reset
clears responses, review, move, reply, errors, and feedback. Browser Back works;
Event has a Calendar return. Left/right cycle directions unless an interactive
control has focus. The bottom pill remains deliberately distinct from product UI.

## Direction rationale and tokens

A uses a persistent sidebar, compact aligned panels and short operational rows.
B uses a masthead, editorial rules, serif hierarchy and large poster treatments.
C uses a people-led header, warmer groupings, soft panels and more generous controls.
They deliberately share content and task semantics, while their shells and
composition differ. Review mobile usefulness before ranking appearance.

| Token           | A — Quiet Workspace    | B — Contemporary Playbill    | C — Community Studio      |
| --------------- | ---------------------- | ---------------------------- | ------------------------- |
| Body font       | system-ui / sans-serif | system-ui / sans-serif       | Trebuchet MS / sans-serif |
| Heading font    | system-ui              | Georgia / serif              | Trebuchet MS              |
| Surface         | #ffffff                | #fcf8ef                      | #fffaf4                   |
| Canvas          | #ffffff                | #fcf8ef                      | #f2eee4                   |
| Text            | #253139                | #292a25                      | #3d3d2b                   |
| Muted text      | #58656d                | #615c52                      | #655f52                   |
| Accent          | #2a5750                | #973c25                      | #59663c                   |
| Soft surface    | #edf3f0                | #efe7d8                      | #eee9d9                   |
| Border          | #d8dfe0                | #cfc4ae                      | #dcd4c4                   |
| Radius          | 6px                    | 0px                          | 20px                      |
| Shadow          | none                   | none                         | 0 8px 32px #44362208      |
| Heading / phone | 36 / 30px              | 48 / 36px                    | 36 / 30px                 |
| Body / caption  | 15 / 12px              | 15 / 12px                    | 15 / 12px                 |
| Weights         | 400 / 600 / 650        | body 400 / 600; headings 400 | 400 / 600 / 650           |

Shared: body line-height 1.6; heading 1.15; spacing 4/8/12/16/24/32px;
content width 1200px; minimum form/button height 44px; visible 3px focus ring.
Semantic status colors: success #e5f2e9 / #255736; warning #fff2d8 / #795012;
error #ffe7e8 / #9a2b32; destructive #a32e32. State is also named in text.
System fonts and local fictional SVG posters avoid network dependencies.
Avatars are fictional initial portraits. Missing-image and long-title samples
are deliberately included. Dark mode is deferred by the brief.

## Walkthroughs

1. **Member / phone:** pending → Callsheet → dismiss Notification (invitation
   remains) → accept invitation → answer Availability Response → locate required
   confirmed Call. Candidate Oct 8 is not a Call; available does not confirm it.
   Ordinary Member is already accepted in Afterlight and has a separate Atlas
   invitation. Pending persona is awaiting Afterlight acceptance.
2. **Operator / phone:** Calendar → Afterlight Oct 9 Performance → inspect selected
   Occurrence → Schedule & Plan → preview Oct 14 conflict → choose Oct 16 → preview
   consequences → submit m1. Original Oct 9 commitment stays until simulated
   eligible non-author approval. Calendar and Callsheet then reflect Oct 16.
3. **Reviewer / phone:** reviewer → Review → inspect exact Atlas r3 and blockers →
   request edits without a reason (validation) → supply reason → request edits.
   Reset, simulate stale state, attempt approval (no save), reload exact revision,
   approve r3. Publication remains Unpublished.
4. **Disclosure:** public Afterlight → simulate sign-in into same Event; compare
   pending Afterlight before/after acceptance. Public Atlas has no presentation;
   authorized approved-unpublished Atlas has an Overview. Producer is not Cast
   and cannot post in the bounded Afterlight conversation. Ordinary Members see
   opaque unrelated venue occupancy, without contact or private title.
5. **Desktop:** Operator Calendar → Daybook then Dense month. Hover/focus booking
   exposes its legible details; touch activation reaches the same Event context.
   Month stacks occupied days on phones. Schedule Blocks open bounded details.
6. **Coordination:** member → conversation → add reply → change direction → verify
   reply remains → Reset. People search has an empty-result case. Component gallery
   includes input, select, checkbox, textarea, links, primary/secondary/destructive,
   disabled, loading, empty, error/retry, focus and a shadcn sheet sample.
7. **Scope:** multi → see both Theaters on personal Callsheet → enter Harbor →
   verify Harbor Call is separate → return to Focus. The secondary case is small
   by design and does not relabel the main fixture.

## Evidence and assumptions

Sources: the complete `docs/design/visual-playground-brief.md`, `CONTEXT.md`,
permissions model, Member journey and programming Calendar READMEs, and operational
actor/state matrix. Canonical `operationalConditions` labels are imported unchanged.
These visual scenarios adapt the pending-invitation, accepted-Cast,
admin-calendar, exact-reviewer, Producer, and public-discovery contracts; they
are not a new exhaustive implementation of all canonical operational scenarios.

Fixed now: Oct 5, 2026, 10am ET. All primary fixtures belong to Focus Theater in
October 2026. There are 24 programming entries. Oct 8 offsite Candidate Slot is
planning only; Oct 15 offsite Rehearsal is committed. Candidate Slots are omitted
from Calendar occupancy. The exclusive hold is a separate reviewed fixture.

The move is a scripted Performance revision: Minimum Viable Cast 3, three
available and one uncertain, accepted staff coverage, 30-minute venue buffers.
Unlike the prior Rehearsal move, this script has no Rehearsal-specific confirmation
gate. It does require explicit submission and eligible approval before replacing
the commitment. Buffer policy, hold expiry, exact confirmation and public snapshot
reconciliation still need a production specification. Public presentation remains
the original published snapshot after an internal move; the preview explicitly
calls out the need to reconcile it. No fixture settles that policy.

No backend security, persistence, concurrency, delivery, Notifications emission,
profile consent, feed, or exports are implemented. Stale feedback is a script.
Event conversation is only an accepted-participant visual sample; this does not
establish a messaging permission contract. Lab comparison shows all three canvases
side by side; at modest desktop widths these canvases naturally use phone layouts.
Component token labels follow each canvas direction, including comparison mode.

## Checks and review status

Typecheck and build passed. Scoped ESLint and whitespace checks passed. Temporary
headless Chromium checks exercised the walkthroughs in A/B/C, all nine surfaces at
360px, screenshots at 390px and 1440px, state retention/reset, stale/validation,
public/pending/conversation disclosure, and sheet Escape. No browser page errors
or page-wide overflow were observed. Real software-keyboard behavior remains a
human device check; a 600px-height narrow viewport is only a proxy.

Phone and desktop Callsheet/Event screenshots were visually inspected. The first
Event layout put actions below too much descriptive copy; the revision now places
an authorized next action above the poster and groups statuses across full width.
Daybook is legible but long; compare its scroll cost with dense month. The lab
controls and switcher add review-only vertical space and can overlap the viewport
in full-page screenshots. These are agent observations, not usability findings.

Screenshots: `docs/design/visual-playground-evidence/`. Human task success,
hesitation, backtracking, ease and aesthetic preference have not been measured.
Use `observations.md` for the review. Final branding and measured usability remain open.
Keep this code on `prototype/visual-playground`. The maintainer authorized its
capture and push as review evidence; production adoption remains separate.
The consolidated source documentation has been committed and merged into `main`.

## September 30 review refinement

See [review round 1](../../../docs/design/visual-playground-review-round-1.md).
A is now the neutral shadcn skeleton starting point: reordered sidebar, mobile
navigation sheet, sidebar notification/account panes, cleared response actions,
and a separate confirmed schedule column. Posters display in full at 4:5.
Calendar has shareable `month=10&year=2026` controls; other periods are empty
fixtures. Event Overview includes contextual Occurrence timeline entries.
The one-option Availability demo is retained only as an old fixture; multi-option
polling and Teams require workshop before a production specification.
Earlier screenshots and walkthrough text describe revision 1; round-1 screenshots
are named `round-1-*`. This review supersedes the earlier statement that no human
review has occurred, but does not choose a final branded visual system.

## Availability and Teams workshop

See [round 2](../../../docs/design/visual-workshop-round-2.md) and the
[draft specification](../../../docs/specs/theater-workspace-skeleton-draft.md).
The one-option demo has been replaced with three Candidate Slots, editable
responses, a Producer/Director comparison and closure. Directory supports
self-service Team creation, Team invitations and member departure; the sole
remaining Member becomes Owner. Casting supports Team expansion, subsets,
deduplication and individual pending invitations. The `director` lab scenario
adds explicit Event leadership. New interactions share root in-memory state,
retain it across direction changes and clear it on Reset. No production
permissions, persistence, schema or library choice is implied.
