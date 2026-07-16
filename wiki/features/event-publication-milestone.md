# Event Publication Milestone

Documentation status: active

Implementation status: specified, not implemented

## What Does This Milestone Prove?

This is Stagecom's first meaningful product win. It proves that multiple Theater Members can coordinate a performance Event from membership through public publication using one trusted operational record.

## Primary Journey

1. An Owner creates and publishes a Theater.
2. Members join through a Reusable Join Link.
3. An eligible Producer creates a performance Event.
4. The Producer assigns a Director and adds Rehearsal and Performance Candidate Slots.
5. The Director invites Theater Members and collects participation and availability responses.
6. The Producer selects a viable Proposed Cast and preferred schedule.
7. The Producer submits an immutable Proposal Revision.
8. Owner/Admin issues a Counteroffer or requests edits.
9. Cast responds to any new slot; the Producer accepts and resubmits.
10. A Reviewer approves the operational proposal.
11. The Producer prepares public copy, public cast credits, ticket price, and an external admission link.
12. Owner/Admin publishes the Event.
13. An anonymous visitor views the Event on the published Theater page.

## Supporting Journeys

- Owner self-approval is possible through an explicit, audited override.
- A Reviewer may deny a proposal with a reason.
- A Producer may derive a linked replacement from a denied proposal.
- Cast withdrawal below Minimum Viable Cast changes an approved Event to `at risk`.
- Owner/Admin may reschedule, revise, allow, or cancel an at-risk Event.
- Cancelling a published Event leaves a public cancellation notice.

## Implementation Boundary

The current repository contains route shells, UI demonstrations, schema foundations, and smoke coverage for parts of auth, onboarding, Theater setup, and public Theater rendering. Persistent Theater setup, membership acceptance, Theater publication, and the Event workflow remain unimplemented or incomplete.

The accepted product boundary lives in `docs/product/event-publication-milestone.md`. Detailed implementation specs have not yet been written.
