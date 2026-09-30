# Visual playground brief

Status: Ready for playground implementation following the September 29, 2026
design-brief interview. Exploratory design work, not a production specification.

## Purpose

Build a separate shadcn-based playground to compare three distinct visual
directions using the same realistic Stagecom content and tasks. Choose and
refine tokens through rendered exploration before updating production pages.
This document records the agreed brief. Visual choices will be settled through
the playground, not further abstract preference interviews.

## Settled requirements

- Reopen fonts, colors, spacing, component styling, and page layouts. Existing
  design-baseline prescriptions are reference material for this exploration,
  not requirements to preserve. Production tokens remain unchanged at this stage.
- Design mobile first. Every direction must support both Member participation
  and substantive Theater Operator work on a phone, including quick adjustments.
  Desktop may use a different arrangement where it helps. A phone layout that
  merely displays data and postpones real work to desktop is insufficient.
- Explore a traditional SaaS application shell: persistent desktop sidebar,
  contextual navigation, and a central workspace whose presentation suits its
  task, such as a calendar for programming and a directory for People. Its
  mobile navigation and scope model must be tested rather than inferred from
  the desktop sidebar.
- Compare common components and Callsheet, Event details, and scheduling.
  Include complete representative Review, public Theater, and public Event
  screens in every direction, with narrowly scripted interactions: one Proposal
  review and decision flow rather than every workflow branch.
- Make Quiet Workspace the strongest traditional SaaS-shell interpretation.
  Other directions may explore different navigation and composition with the
  same destinations. Expect iteration after the first rendered comparison.
- An Event has one recognizable destination serving its public presentation
  and the authorized work of connected people. Activating its Calendar entry
  leads there with the selected Occurrence in context. Avoid presenting a
  separate disconnected public Event and private Event product experience.
  This does not authorize disclosure of private data to public viewers.
- The desired experience is belonging to a Theater's Stagecom site: check its
  Calendar, work on connected Events, and discover people and their activity
  within authorized visibility. Event coordination and eventual communication
  should give Members a reason to return instead of relying on Discord, text,
  or email. Social features and exports are future intent, not authorization
  to add them to this playground or claims of shipped capability.
- Use `/dev/components` to inform the component inventory, not as a source of
  authoritative vocabulary or required styling.

## Theater portal and Event destination

The Theater owns and provides the Stagecom space in the Member's experience.
Use fictional Focus Theater as the primary fixture. Theater identity and
current context should be apparent throughout. The portal is its operational
hub and, through bounded communication exploration, a place for its community.

Design the single-Theater experience first. Multiple memberships remain valid
in the data model; joining or switching Theaters is secondary navigation,
not an onboarding prerequisite or the organizing premise of every screen.
Preserve the landing context through sign-in: a Theater entry returns to that
Theater, and an Event entry returns to that Event with authorized content.
Use the active Theater portal for the playground's general signed-in entry.
Do not build new global account-routing behavior as part of this prototype.

This explicitly supersedes the STA-64 rule that Home must always lead to the
personal Callsheet **for this redesign exploration**. The Theater landing is
the portal home; Callsheet remains an explicitly named, accessible personal
destination. Do not redefine the cross-Theater Callsheet as Theater-only data
or discard other memberships. The main fixture has one Theater, with a small
secondary switching case to verify that scope remains understandable.

Preserve Callsheet's learned priorities: responses, personal commitments, and
discovery remain distinct. The prior rejection of a cramped Theater portal is
a warning to test space and hierarchy, not a veto of the newly agreed model.

Calendar is a Theater programming view; Events provides access to Event records,
including unscheduled ones; People is a directory. These can be arranged
differently across directions. "One Event destination" means one destination
for each Event across public and connected views, not that Schedule Blocks or
every calendar entry become Events. Event-linked entries select their
Occurrence inside that Event; standalone entries retain appropriate destinations.

Each Event uses a shared identity/header and Overview, with authorized sections
such as Schedule & Plan, Cast & Team, Review, Public Page, and History as
applicable. Show the viewer's next action prominently. Use compact section
navigation on phones. Public visitors see only the published presentation;
connected viewers gain only their authorized controls and private information.
An unpublished Event has a working Overview for authorized viewers and no public
access. Pending invitations retain their limited response view. Shared identity
does not mean sharing a private read model with anonymous viewers or exposing
unpublished copy as the public version.

Include one exploratory Event conversation sample for accepted participants,
with a short thread and an in-memory reply. Its purpose is to test whether
coordination belongs naturally in the Event destination. It creates no new
messaging permission contract, delivery, Notifications, or persistent messages.
Do not add a general social feed, messaging platform, or export implementation.

## Product constraints and learned needs

- Preserve the personal, cross-Theater meaning of Callsheet and its distinct
  response-needed work, upcoming commitments, and published Event discovery.
  The navigation change is explicitly described above.
- Theater destinations identify their Theater. Authority comes from contextual
  relationships, not a global role mode. A prototype persona switch is only a
  development control.
- Keep personal commitments, shared Work Queue, Operational Exceptions, and
  Notifications distinct. Dismissing an alert does not resolve domain work.
- Use Event, Theater Member, Occurrence, Candidate Slot, Confirmed Slot, and
  other canonical terms from `CONTEXT.md`. Producer does not imply Cast Member;
  explicit accepted participation is required. Pending staffing is not coverage.
- Keep lifecycle, Proposal decision, Publication, and operational health
  independent. Operational Approval does not publish an Event.
- Carry forward Daybook and dense month Calendar exploration, booking contacts,
  keyboard/hover quick details, and activation into a contextual destination
  with a clear authorized next action. Touch must support access to equivalent
  information without hover.
- Candidate Slots do not reserve the Primary Venue. Committed bookings, active
  exclusive holds, and Schedule Blocks obey buffered non-overlap. Offsite
  activities do not consume the Primary Venue.
- Preserve viewer-specific disclosure, including opaque occupancy and limited
  pending-invitee content. Public presentation uses published, anonymous-safe
  content; visual similarity to private Theater pages cannot broaden access.
- Preserve data and authorization boundaries. This exploration authorizes no
  schema migration, backend behavior change, or production-page replacement.

## Directions to explore

1. Quiet workspace: restrained type and color, aligned compact information,
   and minimal ornament. The strongest explicit SaaS-shell experiment, with
   a persistent desktop sidebar and a contextual central workspace.
2. Contemporary playbill: expressive headings, editorial composition, and
   Event imagery with operational actions kept legible.
3. Community studio: warm surfaces, approachable type, visible people and
   contacts, and flexible groupings.

These are hypotheses, not selected palettes or fonts. Each must vary meaningful
composition and component treatment, not merely accent color. Shared content,
permissions, tasks, and state keep comparison fair.

## Evaluation contract

Mobile task completion is a requirement for all directions. Assess Member and
Operator tasks separately; do not let pleasant Member screens hide frustrating
Operator work. Record task success, errors, hesitation, and backtracking
separately from aesthetic preference. Include keyboard access, readable contrast,
non-color state cues, realistic long content, and touch-accessible information.

## Comparison tasks

Use the same fictional Theater, people, Events, dates, content, and viewer
relationships across directions. Keep the selected scenario and viewport when
switching direction. Support shareable comparison states, resettable in-memory
interactions, and a component gallery informed by `/dev/components`.

- Member on phone: find and answer a pending invitation or Availability
  Response, then identify the next confirmed Call without mistaking a Candidate
  Slot for a commitment.
- Operator on phone: find an Event from the Theater Calendar, inspect the
  selected Occurrence, preview a schedule adjustment, understand a conflict,
  and reach the permitted next action. A quick adjustment must not bypass
  required confirmation or review.
- Reviewer on phone: inspect the exact Proposal Revision and its blockers,
  then request edits with a reason or approve an eligible revision. Approval
  must not change Publication.
- Public visitor and connected Member: open the same Event destination and
  recognize the same Event while receiving different authorized information
  and actions. Include a pending-invitee state and an unpublished Event case.
- Operator on desktop: scan the same busy programming fixture in dense month
  and Daybook. Compare information density without excusing phone failures.

Compare task completion, mistaken state/authority interpretations, navigation
backtracking, touch friction, and perceived ease alongside visual preference.
Treat correctness and mobile operability as gates, not scores that attractive
styling can outweigh. Record observations before selecting a direction; then
refine tokens and recheck the same tasks before any production adoption.

## Build scope and comparison controls

Build an isolated development route, proposed `/dev/visual-playground`, with
fictional fixtures and resettable in-memory actions. No login or live database
should be required. Keep styles scoped so no production page changes. Use
shadcn primitives and a reusable Stagecom composition layer; do not copy the
throwaway prototype's full component implementation into production components.

Provide direction, screen, viewer/scenario, and viewport controls outside the
product canvas. Record direction and scenario in shareable URLs. Preserve the
same scenario, content, and state when switching directions; provide Reset.
Allow a full-width interactive view and a desktop comparison overview. Phone
comparison must work in an actual narrow browser, not only a scaled screenshot.

Required sample surfaces in every direction:

| Surface | Evidence it should expose |
| --- | --- |
| Theater portal/public Theater | Shared Theater identity; public programming versus authorized personal work and Operator entry points; sign-in context |
| Callsheet | Personal responses and confirmed Calls, distinct shared work, discovery, explicit scope |
| Calendar | Daybook and dense month, booking contacts, opaque occupancy, held versus confirmed states, mobile adaptation |
| Event destination | Published public view, connected Overview and sections, selected Occurrence, pending invitee, unpublished authorized view |
| Review | Exact Proposal Revision, commitments, blockers, reason entry, explicit decision and result |
| People | Small authorized directory with search and recognizable identities, without inventing disclosure of private activity |
| Event conversation | Bounded exploratory thread and in-memory reply |
| Components | Tokens, typography, controls, states, and representative compositions |

Use the same asset set, copy lengths, and data volume across directions. Provide
realistic fictional Event descriptions, posters, avatars, names, deadlines,
locations, and role relationships, plus missing-image and long-title cases.
Adapt existing scenario-contract semantics and Calendar fixtures into one
coherent Focus Theater timeline; do not splice unrelated September and October
examples together as though they were one schedule. Keep dates and "now" fixed
for repeatable review.

Fixture coverage must include: a pending Cast invitation; an availability
request; a confirmed Call; an Operator who is also Cast; a Producer who is not
Cast; an eligible non-author Reviewer; approved/unpublished and published/At Risk
Events; an unscheduled draft; a Primary Venue booking, exclusive hold, opaque
Schedule Block, and offsite activity. Use only relationship-authorized content
for each viewer. Prototype persona selection must never resemble a product
control that grants authority.

The schedule-adjustment script should offer a conflicting target and a viable
target, show consequences and required next steps, and preserve the existing
commitment until the modeled approval succeeds. Use the existing reviewed move
fixture's assumptions with explicit notes; do not resolve outstanding hold or
confirmation policy through visual implementation. Review should demonstrate
requesting edits with a reason and approving an eligible exact revision in
separate resettable states. Include stale-state feedback without pretending to
implement concurrency control.

## Component and token exploration

Inventory: typography; primary/secondary/destructive buttons and links; text
inputs and textareas; selects, checkboxes, and validation; search and filters;
navigation and section tabs; avatars and Event imagery; cards, rows and lists;
date/time and venue labels; independent status labels; alerts; dialogs or sheets
for bounded actions; loading, empty, error, retry, disabled, and focus states.
Include a booking, personal response, shared decision, watch-only exception,
and Notification so visual treatment reinforces their different meanings.

For each direction, supply an initial internally coherent token set covering
font families, type scale and weights, line height, surfaces, text, borders,
accent and semantic states, spacing, radii, shadows, content width, and control
sizes. Exact values are implementation experiments. Begin with a complete light
presentation to keep the first comparison bounded; dark mode is a later visual
iteration, not a production capability decision.

Quiet Workspace should test structured lists, low ornament, a desktop sidebar,
and efficient mobile actions. Contemporary Playbill should test expressive type,
image-led hierarchy, and editorial sections without pushing tasks below excessive
decoration. Community Studio should test warmer grouping, people and contact
recognition, and comfortable touch interactions without a generic social feed.
All three must expose the same information and complete the same tasks.

Evaluate at narrow phone widths around 360–390 CSS pixels and a representative
desktop width. Use content-driven intermediate breakpoints. Dense month may
become stacked days on phones. Avoid page-wide horizontal scrolling, hover-only
actions, tiny calendar targets, and oversized headers that hide useful work.
Verify forms and primary actions remain usable with the software keyboard open.

## Review and completion criteria

Run each comparison task on phones before assessing desktop enhancements.
Rotate direction order between reviewers. Record task outcome, errors, recovery,
backtracking, ease rating, and freeform observations. Ask separately which
direction feels like a credible Theater-provided space and encourages returning
for coordination. Timing can reveal friction but is not a substitute for task
success or evidence of broad usability.

The playground is ready for design review when all three complete the same
scripted tasks; required surfaces and component states are present; links,
Back, section navigation, reset, and comparison controls work; disclosure
fixtures are correct; and actual phone-size and desktop rendering have been
visually inspected. Run proportionate repository type/build checks and targeted
interaction checks. Record known limitations and provide reproducible URLs.

Deliver the playground with a short direction rationale, token inventory,
scenario walkthrough, screenshots at phone/desktop widths, and an observation
template. No winning direction is predetermined. After comparison, select a
direction or evidence-backed combination, iterate its tokens and compositions,
and repeat the tasks. Production migration is separate work after that review.

## Source evidence and limits

- `CONTEXT.md`; `wiki/data/permissions-model.md`; `wiki/data/data-model.md`.
- `wiki/product/overview.md` and
  `wiki/workflows/review-scheduling-and-publication.md`.
- `wiki/design/member-home-direction.md` and
  `src/features/member-journey-prototype/README.md`: selected Callsheet
  hierarchy and navigation lessons, not production implementation approval.
- `src/features/programming-calendar-prototype/README.md`: reviewed Daybook
  and dense month direction. Current product docs still describe a week/resource
  default; distinguish the selected exploration from implemented behavior.
- `docs/design/operational-actor-state-matrix.md` and
  `src/features/operational-workspaces/scenario-contract.ts`: preserve scenario
  classification, audience, actions, and disclosure when adapting fixtures.
- `wiki/design/operational-workspaces-validation.md`: internal review evidence;
  no basis to claim measured usability or external uncoached validation.
- `docs/design/design-baseline.md`, `wiki/design/design-system.md`, and
  `src/routes/dev.components.tsx`: current visual reference and inventory.

Conversation, profile consent, pre-review holds, and exact move-flow behavior
still contain exploratory decisions. Any such fixture assumptions must be
explicit and must not silently establish new product rules. No new domain term
or durable architectural decision has been made by this visual-design interview.
