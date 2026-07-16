# Event Publication Milestone

Status: accepted product direction; not implemented

## Outcome

The first meaningful Stagecom milestone proves that multiple Theater Members can take a performance Event from membership and early planning through casting, scheduling, Theater review, Operational Approval, and public publication.

The foundation Theater-home slice remains a prerequisite but is not sufficient by itself.

## Primary Product Journey

1. An Owner creates and publishes a Theater.
2. Members join through a Reusable Join Link.
3. An eligible Producer creates a performance Event.
4. The Producer assigns a Director and proposes Rehearsal and Performance Candidate Slots.
5. The Director invites Theater Members and collects participation and availability responses.
6. The Producer selects a viable Proposed Cast and preferred schedule.
7. The Producer submits an immutable Proposal Revision.
8. Owner/Admin issues a Counteroffer or requests edits.
9. Cast responds to any new slot; the Producer accepts and resubmits.
10. One authorized Reviewer grants Operational Approval.
11. The Producer prepares public content, cast credits, ticket price, and admission details.
12. Owner/Admin publishes the Event.
13. An anonymous visitor views it through the published Theater.

## Essential Alternate Outcomes

- A Reviewer may approve, deny, request edits, or Counteroffer.
- A denial closes the proposal but may be the source of a linked replacement.
- An Owner may use an explicit audited self-approval override.
- A Counteroffer temporarily holds one exact slot and requires Producer acceptance before its deadline.
- Cast withdrawal below Minimum Viable Cast changes the Event to `at risk` and requires management intervention.
- Owner/Admin may revise, reschedule, allow, or cancel an at-risk Event.
- Cancelling a published Event leaves a public notice.

## Governing Product Documents

- Domain language: `CONTEXT.md`
- Product overview: `wiki/product/overview.md`
- Membership and authority: `wiki/product/membership-and-governance.md`
- Lifecycle: `wiki/workflows/event-lifecycle.md`
- Casting and availability: `wiki/workflows/casting-and-availability.md`
- Review and publication: `wiki/workflows/review-scheduling-and-publication.md`

Detailed schema, command/query, state-machine, interface, and executable-acceptance specs are intentionally deferred to the specification phase.
