# Data Model

Documentation status: active

Implementation status: partially implemented

The rebuild keeps the existing Supabase schema as its executable baseline and adds forward migrations. Product requirements that are not in migrations are described as target model, not current schema.

## Current Executable Baseline

- User-facing Events are stored in the `shows` table.
- Theater roles include the rebuild's `owner`, `admin`, and `member` values alongside legacy enum history.
- `show_roles`, `show_occurrences`, `show_cast`, and `show_review_events` provide early Event foundations.
- Published Theater visibility depends on `theaters.status = published`.
- Event lifecycle, Publication, and operational health are persisted independently on `shows`; the legacy Event status remains during expansion.
- Draft Theaters may keep public identity fields incomplete; a database constraint requires the complete identity before `published` state can be stored.
- Theater creation atomically writes the Theater, first Owner membership, default-membership choice when applicable, and creation event.
- Publication and default-Theater changes use transactional database functions, and active membership permits at most one default Theater per person.
- Email-specific Theater invitations store hashed tokens.
- Activity history is stored in `activity_events`.
- Event staff defaults are separate from per-Event staff assignments.
- `show_acts` supports simple public grouping and running order.
- Public media uses the `theater-assets` storage bucket.

## Event State Expansion

The executable schema now stores Event lifecycle (`draft`, `in_review`, `approved`, `cancelled`, `completed`), Publication (`unpublished`, `published`), and operational health (`on_track`, `at_risk`) as separate enum-backed fields. Legacy rows map explicitly:

| Legacy status | Lifecycle | Publication | Operational health |
| --- | --- | --- | --- |
| `draft` | `draft` | `unpublished` | `on_track` |
| `pending_review` | `in_review` | `unpublished` | `on_track` |
| `approved` | `approved` | `published` only when publicly listed; otherwise `unpublished` | `on_track` |
| `rejected` | `cancelled` | `unpublished` | `on_track` |
| `cancelled` | `cancelled` | `unpublished` | `on_track` |

The retained `shows.status = rejected` value preserves the legacy distinction while its lifecycle maps to the terminal `cancelled` state. Migrated rows begin `on_track` because the legacy schema has no reliable operational-risk signal. Legacy writes synchronize forward during expansion; the independent dimensions do not collapse back into the lossy old status.

## Target Event Model

The existing schema does not yet express the agreed workflow completely. The target model must support:

- an Event that persists from draft through completion or cancellation
- typed Rehearsal and Performance Occurrences
- multiple Candidate Slots per Occurrence and one Confirmed Slot
- Event-wide cast membership with per-Occurrence required, optional, or not-called assignments
- per-Candidate-Slot availability responses
- immutable numbered Proposal Revisions
- review decisions including Counteroffers and Denials
- exclusive Counteroffer holds with deadlines
- Proposal decision state on immutable Proposal Revisions
- Theater proposal policy and explicit Proposer/Reviewer capabilities
- Targeted Invitations and Reusable Join Links
- explicit ticket Sales Channel and price

These are specified product requirements, not claims about the executable schema. A future schema spec and forward migration must reconcile the current tables and enums with this model.

## Active Sources

- `CONTEXT.md`
- `docs/data/data-model.md`
- `docs/product/event-publication-milestone.md`
- `supabase/migrations/`

## Generated Types

The generated TypeScript schema lives at `src/server/db/database.types.ts`. Regenerate it after applying local migrations with `npm run db:types`.
