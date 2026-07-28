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
- Theater Event governance stores Producer eligibility, Owner self-approval,
  the Counteroffer response window, a stable Primary Venue identity and name,
  and setup/turnover buffers.
- `theater_member_capabilities` stores narrow Proposer and Reviewer grants;
  `show_leadership` stores explicit Producer and Director assignments.
- `show_occurrences` stores ordered Rehearsal and Performance children with
  public/internal visibility and an optional Confirmed Slot reference.
- `show_candidate_slots` stores each exact instant, duration, local timestamp,
  IANA timezone, timezone provenance, UTC offset, and either the stable Primary
  Venue resource or an explicitly approved off-site location.
- Event-wide cast thresholds live on `shows`; `show_resource_requests` stores
  ordered staff, equipment, and other limited-resource requests.
- Draft Theaters may keep public identity fields incomplete; a database constraint requires the complete identity before `published` state can be stored.
- Theater creation atomically writes the Theater, first Owner membership, default-membership choice when applicable, and creation event.
- Publication and default-Theater changes use transactional database functions, and active membership permits at most one default Theater per person.
- Email-specific Targeted Invitations and Reusable Join Links store hashed
  tokens. Reusable links support optional expiry/use limits, revocation, and
  rotation lineage.
- Activity history is stored in `activity_events`.
- Event staff defaults are separate from per-Event staff assignments.
- `show_acts` supports simple public grouping and running order.
- Public media uses the `theater-assets` storage bucket.
- `show_cast` stores explicit private Event invitations and participation
  responses, including inviter and response timestamps. Invitation and response
  facts are durable activity events; in-app invitation notifications are
  deduplicated projections of those events.

## Event State Expansion

The executable schema now stores Event lifecycle (`draft`, `in_review`, `approved`, `cancelled`, `completed`), Publication (`unpublished`, `published`), and operational health (`on_track`, `at_risk`) as separate enum-backed fields. Legacy rows map explicitly:

| Legacy status    | Lifecycle   | Publication                                                    | Operational health |
| ---------------- | ----------- | -------------------------------------------------------------- | ------------------ |
| `draft`          | `draft`     | `unpublished`                                                  | `on_track`         |
| `pending_review` | `in_review` | `unpublished`                                                  | `on_track`         |
| `approved`       | `approved`  | `published` only when publicly listed; otherwise `unpublished` | `on_track`         |
| `rejected`       | `cancelled` | `unpublished`                                                  | `on_track`         |
| `cancelled`      | `cancelled` | `unpublished`                                                  | `on_track`         |

The retained `shows.status = rejected` value preserves the legacy distinction while its lifecycle maps to the terminal `cancelled` state. Migrated rows begin `on_track` because the legacy schema has no reliable operational-risk signal. Legacy writes synchronize forward during expansion; the independent dimensions do not collapse back into the lossy old status.

## Target Event Model

The existing schema does not yet express the agreed workflow completely. The remaining target model must support:

- an Event that persists from draft through completion or cancellation
- Event-wide Proposed Cast selection from accepted Cast membership
- immutable numbered Proposal Revisions
- review decisions including Counteroffers and Denials
- exclusive Counteroffer holds with deadlines
- Proposal decision state on immutable Proposal Revisions
- explicit ticket Sales Channel and price

Cast participation, per-Candidate-Slot Availability Responses, and
per-Occurrence Calls are executable. Participation does not write or imply
Candidate Slot availability, and Availability Responses do not accept Event
participation. Responses and Calls use optimistic versions plus durable command
identities so stale edits conflict and retries do not duplicate activity facts.
Pending invitees receive their own invitation, response form, and accepted Cast
names without the collaborative matrix or Calls. Accepted Cast Members receive
the collaborative roster, availability matrix, and Calls; Event leaders,
Reviewers, and Owner/Admin receive the operational view. Only the active
Director assigns required, optional, or not-called expectations to accepted
Cast Members.

The remaining items are specified product requirements, not claims about the executable schema. Future forward migrations must reconcile the current tables and enums with this model.

Operational-plan edits replace the supplied plan shape transactionally while
preserving supplied Occurrence, Candidate Slot, and resource-request
identifiers. Omitted children are removed, ordering is explicit, and every
successful save emits `event.operational_plan.updated`. Only a currently
eligible assigned Producer may save while the Event is a draft.

## Active Sources

- `CONTEXT.md`
- `docs/data/data-model.md`
- `docs/product/event-publication-milestone.md`
- `supabase/migrations/`

## Generated Types

The generated TypeScript schema lives at `src/server/db/database.types.ts`.
Regenerate it from the authoritative remote schema with `npm run db:types`.
