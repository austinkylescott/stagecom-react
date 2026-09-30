# Theater workspace skeleton — draft specification

Status: draft for review, September 30, 2026. Not approved for production
implementation. No tickets, remote changes, schema migrations or final visual
tokens are authorized by this document.

Source: maintainer’s visual-playground review and subsequent decisions. Evidence:
`docs/design/visual-playground-review-round-1.md` and the isolated
`prototype/visual-playground` worktree. The root glossary defines Team and Team
Owner. Existing domain, authorization, approval and Publication contracts remain
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

## Next delivery boundary

Review the new workshop surfaces and resolve the listed behavior choices. Then
turn this draft into an approved implementation specification and ticket scope.
Production code must implement app-level authorization, server-side validation,
separate private/public read models, domain events, concurrency and persistence;
the throwaway UI is evidence rather than reusable production implementation.
