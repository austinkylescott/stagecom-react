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

The accepted product model in `docs/product/event-publication-milestone.md` requires schema work that has not yet been specified or migrated:

- typed Rehearsal and Performance Occurrences
- Candidate Slots separate from Confirmed Slots
- per-Occurrence required, optional, and not-called cast assignments
- per-Candidate-Slot availability responses
- immutable numbered Proposal Revisions
- approve, deny, request-edits, and Counteroffer decisions
- exclusive Counteroffer holds and response deadlines
- Proposal decision state on immutable Proposal Revisions
- explicit ticket Sales Channel and price
- per-Event public cast-credit preference

Do not treat current generic JSON availability, the single scheduled `show_occurrences` timestamp, or the retained compatibility `show_status` enum as satisfying these requirements.

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
the default Counteroffer response window, Primary Venue identity, and setup and
turnover buffers. Narrow Proposer and Reviewer capabilities require active
membership and do not change Theater roles.

Managed performance Event creation validates the actor and every co-Producer
against current policy in one transaction. Any active Theater Member may be the
Director, including a Producer. Creation writes one `shows` record with
independent draft, unpublished, and on-track state plus explicit
`show_leadership` rows and durable activity events. It never creates a
`show_cast` row.

## Activity And Notifications

Activity history uses explicit domain events with appropriate visibility. Notifications must originate from domain events; UI code must not create notification rows directly. The first Event-publication milestone delivers workflow notifications in-app only.

## Generated Types

Regenerate committed database types after applying local migrations:

```bash
npm run db:types
```
