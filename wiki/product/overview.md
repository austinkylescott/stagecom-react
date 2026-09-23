# Product Overview

Documentation status: active

Implementation status: partially implemented

Stagecom is a theater-ops-first SaaS product for improv theaters, comedy theaters, indie venues, and community arts spaces.

The foundation slice helps a theater operator create, preview, and publish a credible public Theater home. The first meaningful product milestone goes further: a Theater Member develops a viable performance Event with a cast and schedule, submits it to management, responds to review, and receives approval before an Owner or Admin publishes it.

## Operational Workspaces Contract

Implementation status: partially implemented

The next product frontier is a personal-first, role-aware operating experience.
Every authenticated person starts at Callsheet, where their personal
commitments remain separate from shared Theater decisions they can resolve.
Entering a Theater is explicit; Theater Operations presents the Operator Work
Queue before watch-only Operational Exceptions, schedule pressure, portfolio,
and activity. There is no role mode: actions state the Theater, Event, and
relationship that make them relevant.

The Theater Calendar defaults to a desktop week/resource view and offers list
and month alternatives with identical authorization and opaque-occupancy
redaction. Personal Calendar is now an agenda/upcoming-first cross-Theater
surface. It lists only a person's upcoming accepted Cast and Event-staff
participation, Producer or Director commitments, and required or optional
Calls. Each entry names its Theater, Event, and relationship, links to its
authorized Event workspace, and never imports unrelated occupancy or opaque
Schedule Blocks. A pending Cast invitation is a phone-first personal
commitment from Callsheet: it gives the recipient the invitation state,
inviter, role, and enough Event summary to accept or decline, without granting
Calls, Candidate Slots, or accepted-Cast details first.

The initial Callsheet projection aggregates pending Cast invitations, pending
Admin Invitations, open required Availability Responses, requested Proposal
edits, pending Counteroffer responses, and upcoming Occurrence Calls across
active Theater memberships. An Owner or Admin can offer Admin authority only
to an active ordinary Member through People; the offer is a Member-labeled
personal commitment, grants no authority before explicit acceptance, and keeps
acceptance or decline factual and notification-derived.
An Owner may remove any current Admin, while an Admin may remove themself or a
peer Admin. That removes only Admin authority: the person remains an active
Theater Member, the Owner relationship is excluded from ordinary Admin
management, and the change is recorded in Theater history with its actor and
time.
Each record keeps its Event relationship separate, states its Theater, Event,
relationship, and relevant timing, and provides an anchored path to the
relevant Event action. Theater selection remains below personal commitments;
the separate Theater needs attention section now combines currently resolvable
Work Queue decisions across active Theaters. It labels each decision with its
Theater, Event, relationship, urgency reason, and exact action, including when
the same Event also carries a personal commitment.

The Theater landing page now presents a Work Queue derived from current domain
state. Operators see unresolved At Risk and cancellation decisions, eligible
Theater and Event Publication snapshots, and required staffing needs with an
eligible Member still available to invite. Narrow Reviewers see eligible
Proposal decisions. The shared queue projection can identify an executable
Owner override, including the submitted snapshot's buffered venue conflicts,
but the Operations cockpit excludes that sovereignty action. Self-authored
review and the audited override remain in Event Review. Pending invitations do not count as staffing coverage; a need with
nobody left to invite is watch-only rather than a false Operator action.

Every item states the Theater, Event when applicable, relationship, and priority
reason and links to its domain workspace. Projection refreshes when entering the
page; domain commands recheck current authorization and state. There is no manual
close, assignment, or priority, and Notification read/dismissal state is not read.
Ordering places overdue decisions and At Risk work first, then actual deadlines
within 24 hours, ordinary decisions, and Publication readiness; deadlines and
stable domain identity break ties. The current Operator decision records have no
explicit deadlines, so their deadlines remain unset. Occurrence starts never
manufacture expiry, and expiring Producer Counteroffers remain personal work.
Callsheet builds that cross-Theater section from active membership and each
Theater's authorized Work Queue read. Personal Notification state is not part
of the projection, so reading or dismissing an alert cannot remove shared work.

### Theater Operations cockpit (STA-52)

Owners and Admins receive the same ordinary cockpit: Work Queue, urgent
Operational Exceptions, upcoming Theater Calendar, Event pipeline, then recent
factual activity. The first three decisions retain the queue's deterministic
priority and visible reasons; additional decisions and watch-only conditions
expand in place. No Owner-only action or personal invitation appears in this
ordinary queue.

The next seven days summarize Primary Venue reservations, including ongoing
occupancy and setup/turnover buffers, with the first five intervals and the full
count. The authorized Theater Calendar owns details and Schedule Block controls.
Pipeline counts show lifecycle separately from upcoming/underway commitments,
Publication, and At Risk health; these latter counts overlap and exclude completed
and cancelled Events. Event management stays in Events.

Recent activity shows the latest six member-visible or Operator-visible facts
with actor and time, linking Event facts to History. Self-only records and raw
activity payloads are excluded. A dedicated authorized read model supplies the
cockpit; ordinary Members and narrow Reviewers retain their relationship-scoped
landing without receiving the Theater-wide pipeline or activity.

The desktop cockpit uses two columns in reading order and stacks on phones.
Native disclosure controls preserve keyboard access to additional work. Loading,
empty sections, and retry/Callsheet recovery keep unavailable data distinct from
an empty queue.

### Event portfolio (STA-53)

Events is a filterable list with separate Lifecycle, Proposal decision,
Publication, and Operational health labels. Operators can filter by confirmed
date, leader, each state, and next action, then sort by those dimensions. The
saved views are deterministic: Needs Attention contains Events with a current
viewer-authorized action; Upcoming contains nonterminal Events with a future
confirmed date; Draft/Review contains draft or in-review Events; Published
contains Events whose Publication state is published, including completed or
cancelled records. Views and filters may be combined.

Each summary links to Event Overview and to the exact section for its next
action. Operator decisions reuse Work Queue eligibility, and personal actions
reuse Callsheet commitments. At Risk decisions rank first; urgent personal
responses follow before routine decisions and Publication. Date filters include
confirmed and proposed Candidate Slot dates in the Theater time zone; Upcoming
requires a future confirmed date. Candidate dates are labeled proposed.
Cast and staff participants receive only a limited Event summary from this
list. Unrelated published Events available to ordinary Members link to their
public page with no private Proposal, health, leadership, or scheduling detail.
Unrelated private Events are excluded from the Member query.

Authorized Event collaborators enter a stable Event Overview and select one
authorized workspace section at a time rather than navigating a legacy
single-scroll composition. The Overview keeps lifecycle, Proposal
decision, Publication, and operational health independent; identifies the
viewer’s current relationships; and gives a deterministic primary action before
relationship-labeled secondary or blocked actions. Its authorized projection
summarizes the next confirmed Occurrence, leadership, participation, requested
staffing, viability, and public status. The section links expose only meaningful
authorized content: Schedule & Plan owns planning, Cast & Team owns
participation and staffing, Review owns Proposal Revisions and decisions, and
Public Page owns publication work. History is a separately authorized read of
factual Event domain activity and preserved decisions; it is not a Notifications
or Work Queue projection. Fragment links, including action links to a nested
control, resolve their owning stable section.

People is available to every active Theater Member. Its Directory discloses
only active display names and Owner/Admin badges. Theater Operators receive
separate Invitations, Access & Roles, and Former Members sections for targeted
admission, reusable join links, narrow capabilities, deactivation, and
historical membership; those private records are never included in the Member
Directory projection.

This contract retains the existing public playbill and calm authenticated
direction. A focused visual-design pass and uncoached Operator validation are
follow-ups. Internal validation plus the published reconciliation opens the
first implementation frontier; neither follow-up is evidence for weakening
navigation, action priority, disclosure, or responsive requirements. See the [operational-workspaces
specification](../../docs/specs/operational-workspaces.md), [actor/state
matrix](../../docs/design/operational-actor-state-matrix.md), and
[validation record](../design/operational-workspaces-validation.md).

Published Theater pages now list upcoming published Events by next public
Performance. Each anonymous-safe card shows its published image when present,
title, Performance time and place, admission summary, and a clear cancellation
state. A cancelled Event stays listed until its final scheduled Performance
passes and links to the canonical published Event page. Private planning and
operational fields are excluded from this public query.

## Audience

The rebuild starts with theater owner/admin workflows. Producers, staff, cast, and public visitors are important actors, but the product should first solve theater-level trust, publishing, and coordination.

## What Problem Does Stagecom Solve?

Theater programming is commonly split across forms, spreadsheets, calendars, group messages, ticketing tools, and public websites. Stagecom brings the operational record and the public result into one workflow without turning performers into a generic social network.

## What Is The First Meaningful Win?

A successful milestone journey proves that:

1. An Owner creates and publishes a Theater.
2. Members join through targeted invitations or reusable links.
3. An eligible Producer drafts a performance Event.
4. A Producer and Director assemble a willing, available Proposed Cast.
5. Theater management reviews the schedule and operational commitments.
6. The Event is approved, prepared for publication, and published.
7. An anonymous visitor can view the Event and follow its admission call to action.

## Core Concepts

- Theater: the organization and public identity.
- Event: the continuous programming record from draft through completion or cancellation.
- Occurrence: an Event-specific Rehearsal or Performance.
- Candidate Slot: a possible date, time, and place for an Occurrence.
- Producer: an Event-level proposal, logistics, and public-presentation role.
- Director: an Event-level casting and artistic-participation role.
- Cast: explicit, accepted Event participation by a Theater Member.
- Staff assignment: event-specific operational staffing.

## Product Rules

- Producers are never assumed to be cast.
- Cast membership requires an explicit cast row.
- Producers and Directors are distinct roles, although one person may hold both.
- Owner/Admin controls Theater and Event publication and event staff assignments.
- Operational approval and public publication are separate decisions.
- Scheduling recommendations support human decisions; Stagecom never commits a schedule automatically.
- Public pages expose only published anonymous-safe data.

## What Is Not In The First Meaningful Milestone?

Native Stagecom ticket sales, recurring Event series, open casting calls, guest cast, multiple modeled rooms or venues, committee review, automated application email/SMS, audience analytics, and automated Producer reliability scores are deferred.

### Watch-only Operational Exceptions (STA-51)

Theater Operations separates resolvable Work Queue decisions from Operational
Exceptions. Current Operators, Reviewers, and Event leadership can monitor
Counteroffers and their exclusive temporary holds within 24 hours of expiry.
Expired or resolved Counteroffers disappear from this projection; Producers keep
their separate response commitment while a response remains possible.

Approved Events missing a public-content revision, description, or image create
a Producer commitment on Callsheet and an exception for Operators who are not
also Producers. A previously published revision with no new draft is not missing
content. Staffing gaps become exceptions when the viewer cannot invite coverage;
pending invitations never count as accepted coverage. Requested edits and review
that requires another Reviewer remain watch-only for viewers without that action.

Exceptions show scope, reason, urgency, and an authorized context link, with no
manual close or completion control. Notification read/dismissal state has no
influence. Recorded `event.completion.failed` facts are projected for Operators
only while the Event remains approved and the current final Confirmed Slot matches
the failed evaluation and has ended. STA-49 supplies the automatic evaluator and its failure facts. A later successful
evaluation clears the exception while retaining the failure and completion facts
in Operator-visible Event History.
