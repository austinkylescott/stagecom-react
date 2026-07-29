# Casting And Availability

Documentation status: active

Implementation status: participation invitations, disclosure, Availability
Responses, Occurrence Calls, Proposed Cast selection, and submission viability
implemented

## Who Can Be Cast?

Only active Theater Members may participate in an Event's cast in the first meaningful milestone. Guest cast and public or Theater-wide casting calls are deferred. Producers and Directors invite Members directly.

Producers are never assumed to be cast. Cast membership requires an explicit invitation and acceptance.

The executable workflow lets a current active Event leader invite an active
Theater Member. The invitee explicitly accepts or declines through the Event
workspace. Each action is transactional and emits a durable domain fact;
invitation notifications are projected from that fact with dedupe keys.

## Who Manages Casting?

The Producer owns the proposal, logistics, public presentation, and submission. The Director owns cast invitations and per-Occurrence participation. One Member may hold both roles. The software does not give either collaborator an implicit artistic override over the other.

## What Does A Cast Invitation Ask?

Participation and scheduling are separate responses:

1. Is the Member interested in participating in the Event?
2. For each Candidate Slot, are they available, unavailable, or uncertain?

An accepted invitation means willingness to participate; it does not mean unconditional availability.

## What Can Invitees And Cast See?

- A pending invitee sees the Event summary, Candidate Slots, their own response form, and confirmed cast names.
- A pending invitee does not see pending or declined invitees, Occurrence calls, or other Members' availability.
- An accepted Cast Member sees the collaborative roster, roster statuses, per-Occurrence calls, and the cast availability matrix.
- Producers, Directors, and Reviewers see the information needed to evaluate the full plan.
- Public visitors see only confirmed Cast Members who permit public credit for that Event.

Each accepted Cast Member has a per-Event public-credit setting initialized from their profile preference.

The executable read model enforces the first three private disclosure levels.
Per-Event public credit is implemented through versioned public content.

## How Is Participation Assigned?

Cast membership belongs to the Event. For each Occurrence, the Director marks every Cast Member as:

- `required`
- `optional`
- `not called`

Required Members must confirm the chosen Candidate Slot before the plan can be submitted. Optional Members do not block submission. Each Performance must also meet the Event's Minimum Viable Cast.

## When Is A Cast Ready For Submission?

The Producer deliberately selects a Proposed Cast from Members who accepted. Unanswered or declined invitations do not count and do not freeze the draft. Submission requires:

- a declared target and Minimum Viable Cast
- confirmed availability at or above the minimum for every Performance
- confirmed availability from every Member required for each chosen Occurrence

Individual substitutions after approval do not require resubmission while these commitments remain satisfied. Dropping below the approved minimum changes the Event to `at risk` and requires management action.

## How Does Stagecom Help Choose Dates?

Stagecom may rank Candidate Slots using required-attendee responses, Minimum Viable Cast, and venue conflicts. Recommendations must explain their evidence. The Producer chooses the preferred plan, and management makes all schedule commitments.

The executable recommendation read model ranks each Occurrence's Candidate
Slots deterministically. It reports required confirmations, available called
Cast against Minimum Viable Cast, and Primary Venue conflicts including setup
and turnover buffer. Ranking is read-only: it never changes a Confirmed Slot or
creates a hold.

When management counteroffers a new slot, the entire Proposed Cast receives an in-app availability request. The Producer cannot accept until the confirmed available cast meets the approved minimum.
