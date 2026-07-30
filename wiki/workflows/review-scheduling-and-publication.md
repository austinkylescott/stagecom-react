# Review, Scheduling, And Publication

Documentation status: active

Implementation status: Proposal submission, review decisions, exclusive
Counteroffer reservations, and anonymous-safe Event Publication implemented

## What Does Management Review?

Operational review answers whether the Theater accepts an Event's schedule, Minimum Viable Cast, requested resources, and public/internal Occurrence plan. It does not freeze ordinary public copy or every named Cast Member.

The editable draft plan is executable: a Producer can order Rehearsal and
Performance Occurrences, enter multiple timezone-safe Candidate Slots, mark an
optional Confirmed Slot, distinguish Primary Venue use from approved off-site
text, declare cast thresholds, and request staff, equipment, or other limited
resources. Producers can select accepted Members for the working Proposed Cast,
compare explainable Candidate Slot recommendations, choose Confirmed Slots,
and submit the viable plan as an immutable numbered Proposal Revision.

Each submission creates an immutable, numbered Proposal Revision so the decision history always identifies exactly what was reviewed.

Submission is one transactional gate. It locks the Event, rechecks Producer
eligibility, accepted Proposed Cast membership, every required confirmation,
Performance viability, chosen slots, and approved Primary Venue conflicts. A
failure returns structured blockers without changing the draft. A success
snapshots leadership, Proposed Cast, Occurrences, Confirmed Slots, Calls,
viability, resources, locations, and visibility, emits a durable domain event,
and moves the Event into review. Command identity and Event-row locking make
retries and concurrent numbering safe.

## What Decisions Can A Reviewer Make?

- `Approve`: accept the Proposal Revision's operational commitments.
- `Request edits`: explain required changes and keep the proposal workflow open for resubmission.
- `Counteroffer`: offer one concrete alternative slot with an exclusive temporary hold.
- `Deny`: close the current proposal with a reason.

A Producer may create a linked replacement from a denied proposal, but management reviews it as a new proposal rather than silently reopening the denial.

Review decisions are executable through one transactional command. It locks the
exact revision, rechecks current active Owner/Admin or designated Reviewer
authority, blocks the revision author, and requires an expected decision
version. One decision moves the revision to approved, changes requested, or
denied; a competing or stale decision conflicts without overwriting history.
Request-edits and denial reasons are required and preserved in an append-only
decision record.

An author who is also an Owner can approve only by explicitly invoking the
Theater's configured self-approval override and supplying a reason. That path
emits a distinct Owner-override domain event. Approval points the Event at the
exact approved Proposal Revision and moves lifecycle to approved without
changing Publication. Operational-plan changes to approved Occurrences,
Confirmed Slots, duration, location, Minimum Viable Cast, resources, or
visibility clear that pointer, return the Event to draft, and emit an approval
invalidation event; unapproved Candidate Slot alternatives and public-content
copy remain outside that approval scope.

A denied revision remains immutable. A current source Event Producer may seed
a linked replacement Event containing the denied operational plan, but the new
Event starts as a draft with new identifiers and does not carry Cast
participation into the replacement.

## How Does A Counteroffer Work?

Reviewers may compare Candidate Slots and tentative schedule arrangements before making an offer. A formal Counteroffer:

- names one exact slot
- creates an exclusive hold on the Theater's scheduling resource
- requires explicit Producer acceptance
- uses the Theater's response-window default, initially 72 hours
- may receive a reviewer-specific shorter or longer deadline

If the offered slot was not already evaluated, the Proposed Cast receives a new availability request. Acceptance is blocked until the available cast meets the Minimum Viable Cast. An expired offer releases the hold and returns the proposal to review; it does not deny the Event.

Accepting a Counteroffer updates the operational plan and creates a new Proposal Revision for review. Acceptance does not itself approve or publish the Event.

This flow is executable through the workspace and transactional command
boundary. A database exclusion constraint atomically rejects competing active
holds and approved Primary Venue commitments after applying the configured
setup and turnover buffers. Off-site offers create no reservation. New slots
create Proposed Cast availability requests and deduplicated in-app
notifications from the issued domain event. Decline and expiration close the
request and release the hold; expiration can run repeatedly from normal reads
or the service-role maintenance function under a deterministic clock.

## How Are Venue Conflicts Handled Initially?

The Primary Venue is one exclusive schedulable resource. Held or confirmed Occurrences cannot overlap, including the Theater's configured setup/turnover buffer. An approved plain-text location override does not block the Primary Venue. Modeled rooms, stages, and additional venues are deferred.

## Does Approval Publish The Event?

No. Operational Approval makes the Event eligible for publication. The Theater itself must already be published, and the Event must satisfy public-readiness requirements.

Producer changes to title, description, image, or other public copy create an unpublished content revision. Owner/Admin performs a lightweight publish action without repeating operational review. Ticket-price and Sales Channel changes use the same lightweight approval path.

The workspace renders the exact allowlisted snapshot selected by the next
publish command. Publication locks the Event and selected revision, rechecks a
published Theater, current Operational Approval, complete copy and admission,
and a confirmed public Performance, then snapshots those public Performances
and promotes the revision atomically. An At Risk Event requires an explicit
Owner/Admin continuation acknowledgement. Later content or admission edits
create a new draft and cannot change the live result until another Publication.

Anonymous reads use one allowlisted database read model. It returns only the
published copy, snapshotted public Performances, permitted Cast credits, price,
Sales Channel, and admission call to action, and returns not found when either
the Event or its Theater is unpublished.

## How Does Initial Ticketing Work?

The first milestone supports general admission and an explicit Sales Channel:

- `external`, with a ticket or reservation URL
- `no advance ticketing`

Native `Stagecom` ticketing is a future strategic capability and must not be inferred from a missing external URL. The Event carries an explicit ticket price, including free/zero or a custom amount.

The interface may offer convenient price presets such as $5, $10, and $15 while always allowing a custom amount.

## What Notifications Are Sent?

Workflow notifications originate from explicit domain events, never directly from UI code. The first milestone uses in-app notifications for invitations, availability requests, review decisions, Counteroffers, approaching expirations, publication changes, and risk alerts. Stagecom-managed email and SMS delivery are deferred; invitation links are shared manually.

Approval, Owner-override approval, requested-edits, and denial events now
project in-app notifications to the Event leadership and Proposed Cast. A
per-recipient dedupe key prevents retries from creating a second notification.
Publication writes `event.published` in the same transaction and projects
deduplicated in-app notifications to Event leadership and accepted Cast.
