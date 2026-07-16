# Event Lifecycle

Documentation status: active

Implementation status: specified, not implemented

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

## How Are Cancellation And Completion Handled?

A Producer may request cancellation, but Owner/Admin performs it. A published cancelled Event remains publicly visible with a cancellation notice so audience members are not left with a disappearing page. Future Occurrences are cancelled and affected participants receive in-app notifications.

An approved Event becomes completed after its final confirmed Occurrence ends. Completion preserves the Event's review, risk, casting, and publication history.

## What History Is Preserved?

Explicit domain events record membership and Event-role changes, cast invitations and responses, availability changes, submissions and decisions, counteroffers and expirations, schedule and publication changes, risk transitions, and cancellation. The record states facts and actors; it does not assign reputation judgments.

See `docs/product/event-publication-milestone.md` for the accepted milestone boundary. Detailed implementation specs have not yet been written.
