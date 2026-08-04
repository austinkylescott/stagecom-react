# Event Publication Milestone

Documentation status: active

Implementation status: implemented and acceptance-proven

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

The Theater foundation is implemented. An authenticated person can create a
persistent Theater with its first Owner membership, persist the required public
identity, choose a default Theater, preview the anonymous-safe result, publish
explicitly, and expose only published Theaters to anonymous visitors. Creation
and Publication are idempotent transactional operations that emit durable
factual events, and the complete migration chain has local database acceptance
coverage.

Targeted Invitation membership is implemented through remote-backed atomic
commands, explicit invalid-state handling, and working Owner/Admin and recipient
screens. Reusable Join Links are implemented. Theater Event governance,
Proposer/Reviewer capability assignment, managed performance Event creation,
explicit Producer/Director leadership, and the editable operational plan are
also implemented. Producers can persist ordered Rehearsal and Performance
Occurrences, Candidate and optional Confirmed Slots, cast thresholds, and
requested resources through one transactional command. Casting responses,
schedule conflict handling, Proposal review, versioned public content, and
anonymous-safe Event Publication are implemented. Owner/Admin can preview the
exact next snapshot, acknowledge At Risk continuation explicitly, publish
without repeating Operational Approval, and leave later edits private until a
new Publication.
The accepted product boundary lives in
`docs/product/event-publication-milestone.md`; detailed implementation tickets
and dependency relationships are tracked under STA-5 in Linear.

## Acceptance Proof

`e2e/event-publication-milestone.spec.ts` is the primary seeded seam. It creates
and publishes a persistent Theater, admits four Members through one Reusable
Join Link, and uses distinct Owner, Producer, Director, Cast, Reviewer, and
anonymous browser contexts through Event Publication and admission.

Focused Playwright specs retain alternate outcomes and disclosure boundaries.
The pgTAP suite owns transactional concurrency, immutable revision,
reservation, lifecycle-clock, and deduplication invariants. Counteroffer expiry
and approaching-expiration notification maintenance both accept an explicit
clock instant, so the suite never waits for wall time.
