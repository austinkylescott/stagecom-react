# Data Model

Status: active current-schema and target-model guide

The executable schema lives in `supabase/migrations/`. Generated types live in `src/server/db/database.types.ts`. Product requirements that are absent from migrations are explicitly labeled as target model.

## Current Executable Baseline

The relevant tables include:

- `profiles`
- `theaters`
- `theater_memberships`
- `theater_invites`
- `shows`
- `show_roles`
- `show_occurrences`
- `show_candidate_slots`
- `show_resource_requests`
- `show_cast`
- `show_review_events`
- `show_staff_assignments`
- `activity_events`
- `notifications`
- `email_outbox`

The rebuild delta migrations add Theater publication state, branding/social metadata, timezone provenance, the `owner` role, email-specific Theater invites, general activity history, staff defaults, simple acts/running order, public asset storage, independent Event state dimensions, and authorization fixes. Draft Theaters may leave publication-required identity fields incomplete; a published-state constraint requires name, slug, tagline, structured address, country, and resolved timezone.

Events now persist lifecycle (`draft`, `in_review`, `approved`, `cancelled`, `completed`), Publication (`unpublished`, `published`), and operational health (`on_track`, `at_risk`) independently while the legacy `shows.status` and `shows.is_public_listed` fields remain available during expansion. Existing rows and legacy writes use this explicit compatibility mapping:

| Legacy status    | Lifecycle   | Publication                                                       | Operational health |
| ---------------- | ----------- | ----------------------------------------------------------------- | ------------------ |
| `draft`          | `draft`     | `unpublished`                                                     | `on_track`         |
| `pending_review` | `in_review` | `unpublished`                                                     | `on_track`         |
| `approved`       | `approved`  | `published` only when `is_public_listed`; otherwise `unpublished` | `on_track`         |
| `rejected`       | `cancelled` | `unpublished`                                                     | `on_track`         |
| `cancelled`      | `cancelled` | `unpublished`                                                     | `on_track`         |

Legacy `rejected` remains distinguishable in `shows.status`; its lifecycle maps to `cancelled` rather than reviving a closed Event as a draft. No legacy field represents operational risk reliably, so migrated rows begin `on_track`. During expansion, legacy writes synchronize forward into the independent dimensions, while writes to the independent dimensions do not collapse back into the lossy legacy representation.

The executable Event plan stores ordered typed Rehearsal and Performance
Occurrences with public/internal visibility. Each Occurrence owns Candidate
Slots and may reference one of them as its Confirmed Slot. A slot persists a
canonical instant, duration, entered local timestamp, IANA timezone, timezone
source, and UTC offset. Its location is either the Theater's stable Primary
Venue resource or approved off-site text. Events also store target and Minimum
Viable Cast values plus ordered staff, equipment, and other resource requests.

Event Cast invitations are explicit `show_cast` rows with inviter, invitation,
response, source, and participation-status facts. Only a current active Event
leader may invite an active Member. Accepting or declining changes only Event
participation; Candidate Slot Availability Responses remain a separate model.
Each invitation and response writes a durable `activity_events` domain fact in
the same transaction. Invitation notifications are projected from that fact
with a per-recipient dedupe key.

Theater creation is transactional across the Theater, first Owner membership, initial default selection, and factual creation event. Publication is an idempotent transaction that writes the published state and factual Publication event once. Active memberships have at most one default Theater per person, and changing that default updates the legacy profile pointer in the same transaction.

## Current Role Model

- Theater roles assigned by rebuild UI: `owner`, `admin`, `member`
- Current persisted Event role: `producer`
- Managed Event leadership: explicit `producer` and `director` rows in
  `show_leadership`
- Theater capabilities: explicit `proposer` and `reviewer` rows in
  `theater_member_capabilities`
- Current cast relationship: `show_cast`
- Current Event staffing relationship: `show_staff_assignments`

Legacy Theater enum values remain in migration history but should not be assigned by new UI.

## Target Event-Publication Model

The accepted product model now includes lightweight Owner/Admin Publication of
a prepared Public Content Revision.

The retained compatibility `show_status` enum does not replace the independent
lifecycle, Proposal decision, Publication, and operational-health dimensions.

`show_proposed_cast` stores the Producer's working selection from accepted
active Cast membership. `show_proposal_revisions` stores immutable numbered
operational snapshots and a unique command identity. Submission locks the
Event, validates required confirmations, Performance Minimum Viable Cast, and
buffered approved Primary Venue conflicts, then emits
`event.proposal_revision.submitted` in the same transaction.

`show_counteroffers` stores one exact offered Candidate Slot, its Reviewer,
target Proposal Revision and Occurrence, response deadline, explicit outcome,
and any resulting Proposal Revision. `show_availability_requests` records which
Proposed Cast Members need to evaluate a newly introduced slot.
`show_schedule_reservations` is the database-enforced exclusive schedule seam
for active Counteroffer holds and approved Primary Venue commitments. Its
exclusion constraint compares buffered time ranges per Theater resource;
off-site slots never create a reservation.

Issuing, accepting, declining, and expiring a Counteroffer are transactional,
idempotent transitions. Acceptance rechecks required Calls and Minimum Viable
Cast, updates the working plan, and submits the next immutable Proposal
Revision without approving it. Expiry is repeatable under a supplied server
clock, runs during workspace reads and actions, and is also available through a
service-role maintenance function.

Approaching expiration is a separate idempotent maintenance transition. It
accepts a supplied clock and window, emits one explicit
`event.proposal_counteroffer.expiring_soon` activity fact per Counteroffer, and
projects deduplicated notifications to current Event Producers.

Event completion is likewise a repeatable transition under a supplied server
clock. An Owner/Admin action or the service-role maintenance entry point moves
only an approved Event whose final Confirmed Slot has ended to `completed` and
records `completed_at` plus one `event.completed` fact. Operational Approval,
Publication, operational health, cast, Proposal decisions, and the Confirmed
Slot's canonical and Theater-local time provenance remain unchanged. A
published completed Event continues to serve its published anonymous snapshot.

Cancellation requests are durable rows in `show_cancellation_requests`; they
record the active Producer, reason, request time, and eventual resolution
without changing lifecycle state. Final cancellation is a separate
Owner/Admin-only command with expected-lifecycle concurrency and command-id
idempotency. `shows.cancelled_at`, `cancelled_by_user_id`, and
`cancellation_reason` retain the definitive fact. In the same transaction,
future Occurrences become cancelled, active future schedule reservations are
released, pending Counteroffers and their availability requests close, one
`event.cancelled` activity fact is written, and deduplicated participant
notifications are projected. Publication and the referenced public snapshot
remain intact for formerly published Events.

`show_public_content_revisions` now stores one current unpublished revision per
Event and preserves previously published revisions as immutable anonymous
snapshots. Each revision contains public title, description, image, explicit
non-negative general-admission price, and an explicit Sales Channel of
`external` or `no_advance_ticketing`. External admission requires an HTTP(S)
ticket or reservation URL; no advance ticketing stores no URL. Native Stagecom
ticketing is not an enum value.

`profiles.public_cast_credit_preference` is copied into
`show_cast.public_credit_enabled` when Cast membership is created. The
per-Event value then changes independently. Revision credit rows snapshot the
display name and permission for every accepted Cast Member, while anonymous
row policies return only credits permitted by the published revision. Producer
edits update the current unpublished revision, or create the next revision
after Publication, without modifying `shows.published_public_content_revision_id`.

`show_public_occurrence_snapshots` stores the confirmed public Performance
facts promoted with a Public Content Revision. `publish_event` validates the
published Theater, current Operational Approval, readiness, and explicit At
Risk continuation in one transaction before changing Publication state,
writing `event.published`, and projecting deduplicated notifications.
`get_published_event` is the anonymous-safe allowlisted read model and returns
no result for an unpublished Event or an Event under an unpublished Theater.

`show_availability_responses` stores one versioned available, unavailable, or
uncertain fact per invited Member and Candidate Slot. It retains the responding
actor, response timestamp, optimistic-concurrency version, and last command
identity. `show_occurrence_calls` stores one versioned required, optional, or
not-called expectation per accepted Cast Member or accepted Event staff member
and Occurrence with the assigning Director and timestamp. Each command identity is also the durable
activity-event identity, making safe retries idempotent while stale versions
return conflicts. Participation remains exclusively on `show_cast`; neither
coordination table writes or infers the other concept.

Operational-plan saves use one service-role-only transaction after explicit
application authorization. They preserve supplied stable child identifiers,
remove omitted plan children, validate draft state and current Producer
or approved state and current Producer eligibility, and emit one durable
`event.operational_plan.updated` fact.

Proposal review stores append-only decision facts separately from immutable
revision snapshots. Each revision accepts one optimistic-versioned approve,
request-edits, or deny decision from a currently authorized Reviewer.
`shows.approved_proposal_revision_id` identifies the exact current Operational
Approval, while linked replacement records preserve the denied revision that
seeded a new Event draft. Approved operational-plan edits are classified
against that snapshot; in-scope changes invalidate approval and reopen the
Event as a draft.

## Events Naming

User-facing Events remain stored in `shows` unless a future migration explicitly accepts the cost of renaming it. Code may use product-facing Event names while database adapters remain aligned with generated `shows` types.

## Public Data Boundary

Public Theater and Event pages use anonymous-safe public queries. Draft, unpublished, internal, membership, availability, review, and operational-history data remain behind authenticated authorization.

## Invitations

The current schema supports email-specific Targeted Invitations. Owner/Admin
creation stores only a SHA-256 token hash and returns the shareable token once.
Acceptance atomically validates the signed-in email, token, expiry, revocation,
and prior use; creates or reactivates one base Member membership; records the
accepting person and time; and emits Theater-local activity. Same-recipient
retries are idempotent.

Reusable Join Links now persist in `theater_join_links`. Creation returns the
raw cryptographic token once while storing only its SHA-256 hash. Links may be
non-expiring, expiring, use-limited, revoked, or rotated; rotations retain a
self-referencing lineage and revoke the prior token atomically. Acceptance
serializes on the token and accepting person, validates terminal state and
limits, creates or reactivates base Member access only, and does not consume a
use for an already-active Member. Creation, acceptance, exhaustion, revocation,
and rotation emit Theater-local activity events.

## Managed Event Governance

Theaters now persist one Producer eligibility policy (`all_members`,
`designated_proposers`, or `admins_only`), audited Owner self-approval policy,
the default Counteroffer response window, a stable Primary Venue identifier and
editable name, and setup and turnover buffers. Narrow Proposer and Reviewer capabilities require active
membership and do not change Theater roles.

Managed performance Event creation validates the actor and every co-Producer
against current policy in one transaction. Any active Theater Member may be the
Director, including a Producer. Creation writes one `shows` record with
independent draft, unpublished, and on-track state plus explicit
`show_leadership` rows and durable activity events. It never creates a
`show_cast` row. Producer authorization re-checks active membership and current
Theater policy instead of treating a historical leadership row as permanent
authority.

Private Event reads now select an explicit disclosure view. Pending invitees
receive the Event summary, Candidate Slots, their own invitation, and accepted
Cast names; accepted Cast Members receive the collaborative roster; Event
leaders, Reviewers, and Owner/Admin receive the operational view. Database RLS
also prevents a pending invitee from selecting other pending or declined Cast
rows.

## Activity And Notifications

Activity history uses explicit domain events with appropriate visibility. Availability and Occurrence Call changes emit `event.availability.responded` and `event.occurrence_call.assigned` facts in the same transaction as their state changes. Notifications must originate from domain events; UI code must not create notification rows directly. The first Event-publication milestone delivers workflow notifications in-app only.

`notifications.read_at` and `notifications.dismissed_at` are recipient-owned
attention state. The authenticated inbox may mark an alert read or dismiss it
through the recipient-scoped `set_notification_attention` transition; both are
idempotent and never mutate the originating Event, Theater, activity fact, or
another recipient's Notification. Dismissed alerts remain available as
historical Notifications but are excluded from the recipient's active
attention list.

## Generated Types

Regenerate committed database types after applying local migrations:

```bash
npm run db:types:local
npm run db:types:check:local
```
