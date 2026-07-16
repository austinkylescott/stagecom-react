# Review, Scheduling, And Publication

Documentation status: active

Implementation status: specified, not implemented

## What Does Management Review?

Operational review answers whether the Theater accepts an Event's schedule, Minimum Viable Cast, requested resources, and public/internal Occurrence plan. It does not freeze ordinary public copy or every named Cast Member.

Each submission creates an immutable, numbered Proposal Revision so the decision history always identifies exactly what was reviewed.

## What Decisions Can A Reviewer Make?

- `Approve`: accept the Proposal Revision's operational commitments.
- `Request edits`: explain required changes and keep the proposal workflow open for resubmission.
- `Counteroffer`: offer one concrete alternative slot with an exclusive temporary hold.
- `Deny`: close the current proposal with a reason.

A Producer may create a linked replacement from a denied proposal, but management reviews it as a new proposal rather than silently reopening the denial.

## How Does A Counteroffer Work?

Reviewers may compare Candidate Slots and tentative schedule arrangements before making an offer. A formal Counteroffer:

- names one exact slot
- creates an exclusive hold on the Theater's scheduling resource
- requires explicit Producer acceptance
- uses the Theater's response-window default, initially 72 hours
- may receive a reviewer-specific shorter or longer deadline

If the offered slot was not already evaluated, the Proposed Cast receives a new availability request. Acceptance is blocked until the available cast meets the Minimum Viable Cast. An expired offer releases the hold and returns the proposal to review; it does not deny the Event.

Accepting a Counteroffer updates the operational plan and creates a new Proposal Revision for review. Acceptance does not itself approve or publish the Event.

## How Are Venue Conflicts Handled Initially?

The Primary Venue is one exclusive schedulable resource. Held or confirmed Occurrences cannot overlap, including the Theater's configured setup/turnover buffer. An approved plain-text location override does not block the Primary Venue. Modeled rooms, stages, and additional venues are deferred.

## Does Approval Publish The Event?

No. Operational Approval makes the Event eligible for publication. The Theater itself must already be published, and the Event must satisfy public-readiness requirements.

Producer changes to title, description, image, or other public copy create an unpublished content revision. Owner/Admin performs a lightweight publish action without repeating operational review. Ticket-price and Sales Channel changes use the same lightweight approval path.

## How Does Initial Ticketing Work?

The first milestone supports general admission and an explicit Sales Channel:

- `external`, with a ticket or reservation URL
- `no advance ticketing`

Native `Stagecom` ticketing is a future strategic capability and must not be inferred from a missing external URL. The Event carries an explicit ticket price, including free/zero or a custom amount.

The interface may offer convenient price presets such as $5, $10, and $15 while always allowing a custom amount.

## What Notifications Are Sent?

Workflow notifications originate from explicit domain events, never directly from UI code. The first milestone uses in-app notifications for invitations, availability requests, review decisions, Counteroffers, approaching expirations, publication changes, and risk alerts. Stagecom-managed email and SMS delivery are deferred; invitation links are shared manually.
