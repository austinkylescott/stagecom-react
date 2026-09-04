# Event Lifecycle

Documentation status: active

Implementation status: partially implemented

## What Is An Event?

An Event is the continuous record of one public performance program from its first draft through completion or cancellation. It is not recreated after approval. Proposal Revisions capture the operational plan submitted at particular points in that lifecycle.

The first meaningful milestone supports performance Events. An Event may contain:

- Rehearsal Occurrences that prepare the cast.
- Performance Occurrences presented to an audience.

A standalone Practice, workshop, audition, meeting, or recurring Event series is outside this milestone.

## What Are The Independent States?

One status cannot accurately represent the workflow. Stagecom keeps these dimensions separate:

| Dimension          | Initial states                                               | Question answered                         |
| ------------------ | ------------------------------------------------------------ | ----------------------------------------- |
| Event lifecycle    | draft, in review, approved, cancelled, completed             | Where is the Event overall?               |
| Proposal decision  | pending, changes requested, counteroffered, approved, denied | What happened to this submitted revision? |
| Publication        | unpublished, published                                       | Can the public see it?                    |
| Operational health | on track, at risk                                            | Does management need to intervene?        |

An Event can therefore be approved, published, and at risk at the same time.

## How Does An Event Move Forward?

1. An eligible Producer creates the Event draft.
2. The Producer adds Candidate Slots and public/operational details.
3. A Director is assigned when casting responsibility is separate.
4. Theater Members are invited and respond to participation and availability.
5. The Producer selects a Proposed Cast and preferred schedule.
6. A Proposal Revision is submitted.
7. A Reviewer approves, denies, requests edits, or counteroffers.
8. Approved Event content is prepared and previewed.
9. Owner/Admin publishes the Event.
10. The Event completes after its last confirmed Occurrence or is cancelled by management.

Creation, submission, and review transitions are implemented. Theater
governance determines Producer eligibility, every co-Producer is checked
independently, any active Member may be Director, and creation persists one
performance Event with draft, unpublished, and on-track state. Leadership is
explicit and never inserts a Cast Member. Approval records the exact Proposal
Revision without publishing; requested edits return the Event to draft; denial
preserves the closed revision and permits a separately linked replacement.

## Which Changes Require A New Proposal Revision?

Operational Approval covers:

- Rehearsal and Performance Occurrences
- confirmed date, time, duration, and location
- Minimum Viable Cast
- requested Theater staff, equipment, or other limited resources
- whether each Occurrence is public or internal

Changing any of these after approval requires a new Proposal Revision. Title, description, image, and individual cast substitutions do not require operational resubmission while the cast remains at or above the approved minimum. Changes to public content, ticket price, or Sales Channel still require lightweight Owner/Admin approval before publication.

## What Happens When An Event Becomes At Risk?

Falling below Minimum Viable Cast or losing required Event leadership emits an explicit domain event, changes operational health to `at risk`, and creates in-app notifications for management and Event leaders. Stagecom does not automatically cancel or unpublish the Event. Owner/Admin chooses whether to revise, reschedule, allow it to proceed, or cancel it.

This transition is executable through one database-owned evaluator. Cast
withdrawal, Availability Response changes, and leadership removal call that
same evaluator inside their transaction. It locks the Event, compares current
active leadership and committed Cast with the approved Proposal Revision, and
increments an optimistic health version only when health changes. Retries do
not repeat the risk event or its per-recipient notification projection.

Theater membership deactivation also calls this evaluator for every Event on
which the Member held current leadership or active Cast participation. It does
so after ending active membership and before removing the current assignments,
so the approved snapshot is compared against the newly inactive relationship
with the deactivating Owner/Admin recorded as the cause actor.

The workspace continues to show lifecycle, the latest Proposal decision,
Publication, and operational health independently. An approved, published
Event therefore remains anonymously visible after becoming At Risk. Owner or
Admin may record an audited continuation reason without clearing At Risk, or
choose revise/reschedule to invalidate current Operational Approval and return
to the Proposal Revision workflow. Management commands reject stale health
versions rather than overwriting a newer choice.

## How Are Cancellation And Completion Handled?

A Producer may record a reasoned cancellation request without changing the
Event lifecycle. The request is preserved in `show_cancellation_requests` and
emits `event.cancellation.requested`; an active Owner/Admin still makes the
final decision. The cancellation command compares the lifecycle state the
operator reviewed, so a concurrent transition returns a typed stale-state
conflict, while a retry with the same command identity returns the original
result.

Cancellation records the actor, reason, and deterministic cancellation time,
marks only future Occurrences cancelled, closes pending Counteroffers and
availability requests, and releases reservations whose commitment range has
not ended. It emits one `event.cancelled` fact and projects one deduplicated
notification per active Event leader or accepted Cast Member. The Event row,
Proposal Revisions and decisions, cast credits, and factual activity remain.
A formerly published Event keeps its anonymous route and immutable published
snapshot with a prominent cancellation notice; admission price and ticket
actions are suppressed. An Event that was never published remains anonymous
not-found.

An approved Event becomes completed automatically after its final Confirmed
Slot ends. A scheduled service-role evaluator uses the database clock, and its
locked transition rechecks the Event's lifecycle and final commitment before
writing one `event.completed` domain fact. A concurrent lifecycle change is a
safe no-op. An unexpected transition failure is retained as one admin-only
`event.completion.failed` Event History fact with diagnostic context; retries
update that fact without duplicating effects or alerts. Completion preserves
Operational Approval, Publication, operational health, casting, Proposal
decisions, and canonical/Theater-local slot facts. Published completed Events
retain their anonymous published snapshot.

## What History Is Preserved?

Explicit domain events record membership and Event-role changes, cast invitations and responses, availability changes, submissions and decisions, counteroffers and expirations, schedule and publication changes, risk transitions, and cancellation. The record states facts and actors; it does not assign reputation judgments.

See `docs/product/event-publication-milestone.md` for the accepted milestone boundary. Detailed implementation specs have not yet been written.
