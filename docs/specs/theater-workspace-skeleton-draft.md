# Theater workspace skeleton — review specification

Status: ready for independent specification review, September 30, 2026.
The maintainer accepted the workshop direction and requested a fresh shadcn
skeleton, then requested this review before issue creation. This is a completed
review draft, not an approved production contract. Proposed policies below
remain proposals. No issues have been created and no fresh skeleton has been
built. No remote changes, migrations, commits or publishing are authorized here.

Start the independent review with [the review handoff](theater-workspace-review-handoff.md).

Source: maintainer’s visual-playground review and subsequent decisions. Evidence:
`docs/design/visual-playground-review-round-1.md` and the isolated
`prototype/visual-playground` worktree. Team and Team Owner are proposed glossary additions in the prototype worktree;
the source workspace glossary has not yet adopted them. Existing domain, authorization, approval and Publication contracts remain
in force; this specification describes composition and proposed new workflows.

## Confirmed design direction

Use a neutral shadcn skeleton before adding branding. A’s persistent sidebar is
the starting point. Navigation order: Callsheet, Calendar, named Theater, People.
Calendar supplies access to Event records including unscheduled drafts. Mobile
navigation uses a drawer/sheet, with notification and account controls at the
top right. Desktop puts those controls at the sidebar bottom. Each opens its own
pane. Callsheet remains personal and cross-Theater; navigation order does not
change the active Theater portal as the general signed-in entry.

Callsheet has an action list beside a chronological confirmed schedule. Clear
answered personal responses from the list; keep current confirmed Calls. Keep
personal commitments, shared Work Queue, watch-only Operational Exceptions and
Notifications distinct. Notification dismissal never completes domain work.

Posters display in full at 4:5, compatible with 1080×1350 submissions. Do not crop
unpredictably placed key information. Render essential Event copy separately and
allow opening the original poster. No new dimensions or submission guidelines
have been selected.

Calendar supports Daybook and month with month/year navigation, one period
heading, keyboard/touch details and contextual activation. A scheduled booking
opens its Event with the Occurrence selected; Schedule Blocks and standalone
activities keep appropriate separate destinations. Preserve opaque occupancy
for viewers without authorized detail. Empty periods must not reuse another
month’s bookings. Do not rank layouts solely by desktop density.

An Event has one recognizable destination and shared identity. Its Occurrences
are a chronological timeline. Public readers see only a published anonymous-safe
presentation and published Performance snapshot. Authorized connected people see
relationship-scoped work. Pending invitees get limited response content, not Cast
planning, Calls or conversation. Unpublished Events are not publicly accessible.
The public snapshot and current private operational plan must remain distinguishable.

## Availability workflow

### Confirmed intent

Participants answer multiple Candidate Slots rather than negotiating dates in
conversation. Producer/Director compares answers and selects a planning target.
Participants may revise their submitted responses until the poll closes.
An answer or chosen candidate does not reserve a venue, confirm an Occurrence or
create a Call. Existing explicit confirmation, eligibility and review gates
apply before a commitment is replaced or created.

### Proposed first version — needs review

- An authorized Event Producer or Director opens a poll for one planning
  Occurrence and supplies Candidate Slots with date, time and venue.
- Invitees to the poll are explicit accepted participants, not inferred from
  Producer status or Team membership. Exact Cast/staff audience needs specification.
- Each option has Available, Uncertain or Unavailable; absence is Unanswered.
  Multiple options can be Available. Proposed submission requires an answer to
  every option, with Uncertain available for undecided participants.
- Separate editable drafts from submitted answers. A draft revision is not visible
  as a submitted response. Submit replaces only that participant’s response set.
- Producer/Director compares individual answers and missing responses as well as
  totals. No automatic winner or silent commitment. Venue conflict checks remain
  independent of availability totals; offsite activities do not occupy the
  Primary Venue.
- Closing freezes response editing. Confirmed scope: responses editable while
  open. Proposed closing authority: Producer/Director. Closure does not select a
  slot, create a booking, satisfy confirmation, or publish an Event.
- A chosen option remains a planning candidate until all applicable operational
  prerequisites and approval steps succeed. Retain the prior Confirmed Slot
  during a move until the replacement is authorized and committed.

Open: option creation/change/revision after responses, deadlines versus explicit
closure, reopening, respondent eligibility and disclosure, response privacy,
selection ownership, multiple polls for an Occurrence, and exact review handoff.
Do not create a poll schema or backend contract until those are resolved.

## Teams and directory

### Confirmed rules

A Team is a named grouping of Theater Members. Members can belong to several
Teams. Members create and manage Teams without requiring Theater management
intervention. Teams have a Team Owner. The sole remaining Member becomes Team
Owner when the other Members have left. An Owner leaving with multiple Members
remaining must choose a successor before leaving. Operator intervention may be available
as a recovery mechanism, rather than being required for ordinary operations.

Example: Austin, Eno and Elijah belong to Ants 2 Gods; Austin also belongs to The
Management; Eno also belongs to Eno & Dan French. Avatars and names support
recognition, filtering and selection. Teams should appear across relevant
interfaces without treating one Team as a person’s exclusive grouping.

### Proposed first version — needs review

- An active Theater Member creates a Team in the current Theater and becomes its
  first Member and Team Owner. Theater-local scope is a proposal, not yet a
  settled rule for cross-Theater Teams.
- Owner manages Team invitations; invited people accept individually before
  appearing as Members. Existing Members can leave themselves. Do not permit
  silent addition of another person without deciding consent policy.
- Team Owner is distinct from Theater Owner/Admin and Event Producer/Director.
  None of those authorities is inherited automatically.
- Directory has name search, Team filters, overlapping Team labels and Team
  details. Proposed visibility: active Members of that Theater; no public Team
  membership or private activity is inferred.
- Leaving a Team does not automatically revoke independently accepted Event
  Cast participation or silently alter a confirmed Call.
- When only one Member remains, that Member is Team Owner. When an Owner leaves
  with several Members remaining, the Owner chooses a remaining Member as successor
  before leaving. Capture departure and ownership transfer together.
- Optional Operator recovery needs authorization and factual history. No recovery
  action is implemented in this prototype.

Open: roles of ordinary Team
Members versus Team Owner; consent and joining; Team renaming, dissolution and
zero-Member lifecycle; membership order/history; revocation of Theater membership;
Team visibility; cross-Theater scope; Operator recovery powers.

## Team-aware casting

Producer/Director invitation authority remains contextual. Theater Operator
visibility alone does not grant Cast invitation authority.

Browse active Members by Team or individually. Selecting a whole Team expands
into individual people and permits removing any subset. Merge overlapping
selections by identity. Already accepted Cast and already pending invitees are
separately labelled and excluded from duplicate invitations. Team selection is
an editor convenience, not a bulk acceptance operation.

Show a named recipient review before sending. Sending creates individual pending
Cast invitations. Only each person’s explicit acceptance grants Cast participation;
pending staffing is not coverage. Event staff, Cast, Producer and Director remain
separate relationships. Existing invitation commands/events should carry behavior
when implemented; UI must not emit Notifications directly.

Open: snapshot versus live selection when Team membership changes before send,
stale membership/access and invitation handling, per-recipient failure reporting,
self-invitation, invitation expiry and withdrawal, and public credit consent.

## Component and label decisions still open

The current month and Daybook are custom prototype layouts. Official shadcn
Calendar is a React DayPicker date/range selector; it can support period/date
controls but does not by itself supply booking/read-model behavior. Compare
custom composition and scheduling-calendar alternatives with the same phone
and Operator tasks before choosing a library.

Draft is lifecycle; Public corresponds to a published presentation. Unpublished
is retained in the prototype rather than inventing Unlisted. Private and Unlisted
need explicit discoverability, anonymous access and link-sharing semantics before
becoming supported visibility modes. Operational Approval, Publication and health
remain independent.

## Acceptance scenarios for the eventual production specification

- Member answers three candidates; submission clears the Callsheet response;
  confirmed schedule is unchanged. Revise while open; drafts do not replace the
  submitted answer until resubmission. Closed poll rejects edits on the server.
- Producer compares availability and missing responses, encounters a venue
  conflict, and chooses an offsite candidate; no booking or Call changes yet.
- Member creates a Team without Operator intervention; another Member accepts a
  Team invitation. Leaving reduces membership without altering independent Cast.
  Sole remaining Member is Owner. An Owner leaving with multiple remaining Members
  must choose a successor; an absent or no-longer-eligible successor blocks departure.
- Select two overlapping Teams and a subset; review unique eligible recipients;
  individual invitations are pending. A non-leader Operator cannot send them.
- Public and pending viewers cannot read poll answers, private Team membership,
  or unauthorized Event planning. Public links identify the same Event.
- Phone drawer, notification pane, search, forms and primary actions work with
  keyboard, touch and a real software keyboard. No page-wide horizontal scrolling.
- Calendar navigates periods, handles empty periods, and preserves selected
  Occurrence context on navigation and Back. Unscheduled Events stay discoverable.

## Scope and delivery sequence

This specification consolidates the reviewed composition and new Availability
and Team workflows. It extends the existing operational-workspaces contract;
it does not replace its review, staffing, ownership or scheduling rules.

1. **Independent specification review:** reconcile the decision register below,
   authorization boundaries and existing-spec differences. Mark each proposal
   accepted, revised or deferred. Preserve unanswered questions as explicit gates.
2. **Neutral component skeleton:** build a fresh isolated TanStack Start workspace
   using actual shadcn primitives, fictional fixtures and resettable in-memory
   behavior. Cover the shell, Callsheet, Theater portal, Calendar/Event index,
   Event workspace, Review, People/Teams and public Theater/Event presentation.
   Preserve the reviewed A structure; do not rebuild three visual alternatives.
3. **Layout review:** exercise the same Member and Operator tasks on phone and
   desktop. Settle component composition and the calendar approach before
   treating page layouts as locked. The development persona controls stay outside
   the product canvas.
4. **Production slices:** reuse existing commands and reads where possible;
   implement new policies only after their decision gates are resolved.
5. **Branding:** layer typography, palette, imagery and bespoke interactions onto
   the reviewed component foundation. Final branding is outside this spec.

The skeleton is an interactive component foundation, not a backend rewrite or
proof of production authorization. Use shared shadcn Button, Sheet, Avatar,
Badge, Tabs, form controls and other suitable primitives. Keep Stagecom
composition separate from primitives. A date picker is not a complete Calendar
implementation. Do not copy the giant throwaway playground component wholesale.

Deferred: persistent conversation/messaging, social feeds, rich profiles and
contact disclosure, native ticketing, calendar sync, multi-resource scheduling,
recurring activities, new visibility modes, Operator Team recovery, dark-mode
branding, remote operations and wholesale migration of production pages.
Standalone workshops/Practices in prototype fixtures are examples, not newly
approved domain capabilities.

## Existing-contract reconciliation

| Topic | Existing contract | This review specification | Required review outcome |
| --- | --- | --- | --- |
| General signed-in entry | Operational-workspaces and original STA-64 direction use Callsheet-first entry | The redesign brief uses the active Theater portal, preserving deep-link context; Callsheet remains cross-Theater | Confirm production entry change separately from sidebar order; retain existing routing until adopted |
| Calendar default | Theater week/resource default with list and month; personal agenda/upcoming | Reviewed exploration favors Daybook and month | Decide whether week is retained, deferred or replaced, and choose the Theater default; do not remove a production view by inference |
| Visual foundation | Existing production fonts/colors retained by older milestone | Fresh neutral shadcn foundation, branding later | Scope neutral styling to the new workspace; later adoption must explicitly reconcile design-baseline guidance |
| People | Directory, Invitations, Access & Roles, Former Members with contextual authorization | Add overlapping Teams to Directory and casting | Preserve Operator-only access administration and Former Member history; Team Owner grants no Theater authority |
| Event identity | Stable sections and separate anonymous-safe public queries | One recognizable Event destination with selected Occurrence context | Shared identity/navigation, with separate private/public reads; route composition cannot broaden disclosure |

Existing accepted domain behavior takes precedence where this review leaves a
policy unresolved. Prototype fixtures cannot supersede production contracts.
The sidebar's first item does not decide the application's signed-in entry.

## Review decision register

The recommendations below make the review concrete. They are not confirmed
maintainer decisions. The reviewer should resolve them before dependent issues
are created; an independent fixture skeleton may proceed with labelled assumptions.

| ID | Decision | Recommended bounded first version | Gate |
| --- | --- | --- | --- |
| R1 | Entry and calendar defaults | Preserve Theater-context entry from the brief; Daybook default plus month in the skeleton. Explicitly reconcile existing week view before production | Production shell/calendar |
| R2 | Team scope and visibility | Theater-local Teams; active Members see Team names and membership in that Theater's Directory; no public membership disclosure | Team reads/storage |
| R3 | Team management and joining | Creator becomes Owner; Owner renames and invites; invitations require individual acceptance; Members leave themselves. Specify whether Owner can remove others and whether all Members can invite | Team commands |
| R4 | Ownership succession | Confirmed departing-Owner choice and sole-remaining-Member ownership. Decide whether successor acceptance is required; prototype assumes immediate transfer on departure. Commit leave and transfer together | Team leave/transfer |
| R5 | Empty Teams and loss of Theater membership | Archive a Team when its last Member leaves, preserving history; forbid an active empty Team. Define succession/recovery when Theater access is revoked and the Owner cannot act | Team lifecycle |
| R6 | Operator recovery | Defer recovery UI; identify an authorized, audited recovery policy before handling orphaned ownership in production. No implicit Operator edit access | Team lifecycle/recovery |
| R7 | Poll audience and answer visibility | Explicit accepted Cast respondents initially, consistent with current Availability Response glossary. Producer/Director sees named answers; respondents see their own answers. No anonymous/public or pending-invitee answers | Poll authorization |
| R8 | Poll creation, revision and response completeness | Producer/Director opens one poll for a planning Occurrence. Freeze options after opening; replace/cancel rather than silently changing answered options. Require all options answered, allowing Uncertain | Poll commands |
| R9 | Closure and retries | Producer/Director explicitly closes; no reopening or automatic deadline closure initially. Server accepts a response only while open; repeated submit/close is safe and stale edits are explained | Poll transactions |
| R10 | Planning selection and approval | Producer/Director selects a planning target; no automatic winner. Reuse existing explicit schedule confirmation/review gates and retain the old commitment until replacement commits | Scheduling integration |
| R11 | Team expansion and stale recipients | Review a snapshot of named people; revalidate active Theater membership, current Team membership and existing invitations at send. Explain changes and require refreshed review; do not silently add new recipients | Casting integration |
| R12 | Casting edge behavior | Reuse existing expiry/withdrawal/self-invitation contracts where defined; specify atomic batch versus per-recipient failure behavior. Public credits remain separately consented | Casting commands |
| R13 | Calendar component | Compare actual shadcn Calendar composition against a custom month/daybook using identical tasks. Select by mobile operation, keyboard access, occupancy and selected-Occurrence context | Calendar layout lock |
| R14 | Visibility labels | Retain existing lifecycle/approval/publication/health labels; defer Private/Unlisted as new modes until access and discoverability are specified | Public/private presentation |

Poll recipient removal, response retention/history, time zones and daylight-saving
boundaries, closure versus simultaneous resubmission, and ownership departure
versus concurrent membership changes must be covered by the chosen policies.
Review existing commands before inventing a new invitation or approval lifecycle.

## Surface and state coverage

| Surface | Required composition and behavior | Representative states |
| --- | --- | --- |
| Shell / Theater | Theater identity, ordered sidebar, mobile sheet, contextual access to operations, notification/account panes | Single/multiple Theaters, Member, Operator, deep-link return |
| Callsheet | Personal actions beside confirmed schedule, published discovery; separate authorized Work Queue and exceptions | Pending invitation, unanswered/submitted poll, upcoming Call, empty work |
| Calendar / Event index | Daybook/month, period navigation, unscheduled records, context-preserving activation | Confirmed, held, offsite, opaque block, empty period, long title |
| Event | Shared identity, next action, authorized sections, typed chronological Occurrences | Draft, pending invitee, accepted Cast, Producer-only, approved/unpublished, published/At Risk |
| Review | Exact revision and commitments, eligible actions, explicit reason and result | Approve, request edits, ineligible/self-authored, stale revision; no automatic Publication |
| People / Teams | Search, avatars/names, overlapping filters, self-service Team workflows | No results, invitation pending, multiple memberships, departure/succession |
| Public Theater / Event | Published discovery, full poster, text date/location/admission and permitted credits | Missing poster, long copy, unpublished inaccessible, published cancellation |

Skeleton states should include loading, empty, validation, error/retry, disabled,
permission loss and stale-state feedback. In-memory feedback illustrates them;
server guarantees belong to production slices. Preserve entered responses on a
recoverable failure and explain when data must be refreshed. Names remain visible
alongside avatars; color or initials alone cannot communicate identity or state.

## Production boundaries and verification

Use thin routes/server functions, feature commands/queries, Zod inputs and typed
application errors. All private reads and mutations enforce contextual app-level
authorization. Separate anonymous-safe published queries from private reads;
privileged database access remains server-only after authorization. Notifications
are projected from explicit domain events. Team membership never grants Cast,
Producer, Director, Reviewer or Operator authority.

Design persistence only after gated policies are accepted. Define transaction and
retry behavior for owner departure/succession, poll closure/submission and batch
invitations. Validate resource conflicts independently from poll totals; preserve
existing buffered non-overlap and immutable Proposal Revision semantics.

For the skeleton, verify type/build checks, primary interactions, keyboard/focus,
360–390px phone reflow, desktop composition, software-keyboard usability and Back/
selected-context behavior. Do not claim a software-keyboard check from Chromium
viewport emulation. Record what was observed versus what remains untested.

For production, add meaningful command/read-model and local database checks for
permission loss, private/public redaction, concurrent ownership changes, closed
poll writes, stale recipient selection and duplicate retries. Exercise visible
Member/Operator journeys with actual routes. Use standard repository checks and
local migration/type checks when schema changes. Remote changes remain separately
approved operations.

## Suggested issue boundaries after review

These are candidate slices, not created issues or a final dependency graph.
Check existing Linear coverage first to avoid duplicating delivered work.

- Neutral component workspace and shell, with fixtures and the approved layout
  matrix; no persistence or production routing replacement.
- Callsheet composition and notification/account panes using existing projections.
- Calendar/Daybook and Event-index composition, gated by R1 and R13.
- Unified Event/public composition and Review presentation using existing contracts,
  with selected Occurrence context and separate read boundaries.
- Directory/Team domain and lifecycle, gated by R2–R6, followed by Team-aware casting
  gated by R11–R12. Do not force a new Team backend into the shell issue.
- Poll domain/authorization and response lifecycle, gated by R7–R9, followed by
  scheduling handoff gated by R10.
- Cross-surface responsive/accessibility verification and documentation reconciliation.

Keep branding as a subsequent reviewed milestone. Do not create implementation
issues with unresolved policy disguised as acceptance criteria.
