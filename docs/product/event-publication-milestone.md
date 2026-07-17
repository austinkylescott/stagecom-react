# Event Publication Milestone

Status: accepted product direction; partially implemented

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

## Implementation Progress

The prerequisite Theater foundation is implemented: persistent Theater and
Owner-membership creation, public identity configuration, default-Theater
selection, private preview, explicit Publication, anonymous published-only
reads, durable creation and Publication events, and local migration/database
verification.

Targeted Invitation membership acquisition is also implemented: Owner/Admin can
create and revoke single-recipient links, authentication preserves invitation
intent, and matching recipients receive idempotent base Member access through
an atomic remote-backed acceptance flow. Reusable Join Links now provide the
same remote-backed membership boundary with governed rotation and limits.
Theater governance and the managed Event-draft boundary are now implemented:
Owner/Admin configures Producer and review policy, every Producer is checked
independently, any active Member may direct, leadership remains separate from
Cast, and creation persists one independently-stateful Event with durable
history. The remaining multi-user workflow still needs Occurrences, casting,
scheduling, review, and Event Publication. Detailed implementation tickets,
acceptance
criteria, and dependency relationships are tracked under STA-5 in Linear.
