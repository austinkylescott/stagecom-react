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

The rebuild delta migrations add Theater publication state, branding/social metadata, timezone provenance, the `owner` role, email-specific Theater invites, general activity history, staff defaults, simple acts/running order, public asset storage, and authorization fixes.

## Current Role Model

- Theater roles assigned by rebuild UI: `owner`, `admin`, `member`
- Current persisted Event role: `producer`
- Current cast relationship: `show_cast`
- Current Event staffing relationship: `show_staff_assignments`

Legacy Theater enum values remain in migration history but should not be assigned by new UI.

## Target Event-Publication Model

The accepted product model in `docs/product/event-publication-milestone.md` requires schema work that has not yet been specified or migrated:

- Director and Reviewer relationships/capabilities
- Theater proposal policies and designated Proposers
- Reusable Join Links with optional expiration and use limits
- typed Rehearsal and Performance Occurrences
- Candidate Slots separate from Confirmed Slots
- per-Occurrence required, optional, and not-called cast assignments
- per-Candidate-Slot availability responses
- immutable numbered Proposal Revisions
- approve, deny, request-edits, and Counteroffer decisions
- exclusive Counteroffer holds and response deadlines
- separate lifecycle, review, publication, and operational-health state
- explicit ticket Sales Channel and price
- per-Event public cast-credit preference

Do not treat current generic JSON availability, the single scheduled `show_occurrences` timestamp, or the existing `show_status` enum as satisfying these requirements.

## Events Naming

User-facing Events remain stored in `shows` unless a future migration explicitly accepts the cost of renaming it. Code may use product-facing Event names while database adapters remain aligned with generated `shows` types.

## Public Data Boundary

Public Theater and Event pages use anonymous-safe public queries. Draft, unpublished, internal, membership, availability, review, and operational-history data remain behind authenticated authorization.

## Invitations

The current schema supports email-specific hashed Theater invitation tokens. The accepted target also requires Reusable Join Links whose possession grants immediate base membership. Link creation, revocation, rotation, expiration, limits, acceptance, membership writes, and activity events must be handled atomically by app commands.

## Activity And Notifications

Activity history uses explicit domain events with appropriate visibility. Notifications must originate from domain events; UI code must not create notification rows directly. The first Event-publication milestone delivers workflow notifications in-app only.

## Generated Types

Regenerate committed database types after applying local migrations:

```bash
npm run db:types
```
