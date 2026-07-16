# Stagecom PRD

Status: active product direction

Stagecom is a theater-ops-first SaaS product for improv theaters, comedy theaters, indie venues, and community arts spaces.

It is not a generic social network for performers. It is an operations product for Theater Owners/Admins who need a credible public presence and a calmer internal workflow for programming, people, casting, review, scheduling, and publication.

## Product Promise

Stagecom helps a Theater run its public-facing programming and internal Event logistics from one trusted source of record.

## First Customer

The primary customer is a Theater operator. Performer, Director, and Producer workflows matter because they reduce the operator's coordination burden, but the product center is the person responsible for the Theater's public identity, publishing, Member access, schedule, and operational trust.

## Foundation Slice

The foundation slice covers:

- magic-link signup/login
- profile completion
- onboarding choice
- Theater setup
- public preview
- published public Theater home

This slice supplies essential infrastructure, but a public Theater profile is not the first meaningful product win by itself.

## First Meaningful Product Win

The first meaningful milestone takes multiple users through the operational loop:

1. An Owner creates and publishes a Theater.
2. Members join through Targeted Invitations or Reusable Join Links.
3. An eligible Producer creates a performance Event.
4. A Producer and Director assemble an accepted Proposed Cast and evaluate Candidate Slots for Rehearsal and Performance Occurrences.
5. The Producer submits an immutable Proposal Revision.
6. Owner/Admin or a designated Reviewer approves, denies, requests edits, or makes a scheduling Counteroffer.
7. The Producer and cast resolve any Counteroffer, and management grants Operational Approval.
8. Owner/Admin publishes the Event after public content and admission details are ready.
9. An anonymous audience member can view the Event and follow its admission call to action.

## Product Language

Use Event for the continuous programming record and Occurrence for one Event-specific Rehearsal or Performance. A Practice is a standalone activity not tied to one Event.

Keep the database table name `shows` until a future migration explicitly chooses the cost of renaming it.

## Role Principles

- Roles are contextual, not global user types.
- Theater roles are `owner`, `admin`, and `member`.
- Producer and Director are distinct Event roles, although one Member may hold both.
- Producers are never assumed to be cast.
- Cast membership requires explicit invitation and acceptance.
- Event staff assignments are separate from Producer, Director, and cast relationships.

## Governance Principles

- Theaters choose whether all Members, designated Proposers, or Admins only may use the Producer workflow.
- Owner/Admin review by default; individual Members may receive a Reviewer capability.
- One authorized review decision is sufficient in the first meaningful milestone.
- Owner self-approval is allowed only through an explicit audited override.
- Operational Approval, publication, operational health, and overall lifecycle are separate concerns.

## Event Model

- An Event persists from its first draft through completion or cancellation.
- A performance Event contains Rehearsal and Performance Occurrences.
- Each Occurrence may have multiple Candidate Slots before one is confirmed.
- Cast membership belongs to the Event; required, optional, and not-called participation belongs to each Occurrence.
- Stagecom may rank scheduling options, but people make every commitment.
- Falling below Minimum Viable Cast marks an approved Event `at risk` and requires human management.

## Trust And Privacy

Theater operators need clear authority over what becomes public. Public pages only read anonymous-safe published data. Member, invitation, cast, staff, review, availability, and activity workflows require explicit authorization through the app-owned API/server-function layer.

Operational history is factual and Theater-local. Stagecom does not produce cross-Theater reputation scores or automatic blacklists.

## Admission Direction

Initial performance Events use general admission with an explicit ticket price and Sales Channel. The first meaningful milestone supports external ticket/reservation links or no advance ticketing. Native Stagecom ticketing is a future strategic capability.

## Business Direction

Stagecom is hosted SaaS first. Keep core product logic self-host-compatible where practical, but do not optimize the initial milestones around self-hosting.

## Foundation-Slice Non-Goals

- billing and subscription management
- realtime chat
- team/troupe modeling
- renaming `shows` to `events`

## First-Meaningful-Milestone Non-Goals

- native Stagecom ticket sales
- recurring Event series
- public or Theater-wide casting calls
- guest cast who are not Theater Members
- multiple modeled rooms or venues
- committee or quorum review
- Stagecom-managed workflow email or SMS
- audience-performance analytics
- automated Producer reliability scoring
