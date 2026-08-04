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
- `show_proposed_cast` stores the Producer's editable selection from accepted
  active Cast membership.
- `show_proposal_revisions` stores append-only, monotonically numbered
  operational snapshots with a unique submission command identity and Proposal
  decision state.
- `show_proposal_decisions` stores the one auditable Reviewer decision for an
  exact Proposal Revision, including reason, actor, expected revision version,
  command identity, and whether the explicit Owner override was used.
- `shows.approved_proposal_revision_id` identifies the exact current
  Operational Approval. `show_proposal_replacements` links a new draft Event to
  the denied immutable revision that seeded it.
- `show_cast` stores explicit private Event invitations and participation
  responses, including inviter and response timestamps. Invitation and response
  facts are durable activity events; in-app invitation notifications are
  deduplicated projections of those events.
- `theater_memberships.membership_version` provides optimistic concurrency for
  deactivation. `deactivate_theater_membership` locks the membership, preserves
  at least one active Owner, ends current capabilities and Event assignments,
  reevaluates affected approved Events, and writes its Theater-local facts and
  notification projections atomically. Historical Proposal and published-credit
  rows are not rewritten.

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

Operational health has its own optimistic
`shows.operational_health_version`. The centralized evaluator reads the exact
approved Proposal Revision and current leadership, Cast, Calls, Availability
Responses, and active Theater memberships under an Event-row lock. A real
`on_track` to `at_risk` transition writes one activity fact and projects
deduplicated alerts. `show_risk_management_decisions` preserves each explicit
Owner/Admin revise, reschedule, allow, or cancel choice with its reason and
prior/resulting health versions. Allowing continuation leaves health At Risk so
the original risk fact and management history remain truthful.

## Target Event Model

The remaining target model must support an Event that persists through
completion or cancellation while preserving its published history.

Versioned public presentation and Publication are executable. An Event has at most one
unpublished `show_public_content_revisions` row; after Publication, later
Producer edits create the next revision and leave the referenced published
snapshot unchanged. Admission always stores a non-negative price and an
explicit `external` or `no_advance_ticketing` Sales Channel. External requires
an HTTP(S) ticket or reservation URL, while no advance ticketing stores no URL.
Native Stagecom ticketing remains out of scope.

`show_public_occurrence_snapshots` freezes the confirmed public Performance
facts selected during Publication alongside the published Public Content
Revision. The Event retains independent lifecycle, Publication, and operational
health fields; publishing an explicitly allowed At Risk Event does not erase
its At Risk condition. `get_published_event` is the anonymous allowlist and
returns no row unless both the Theater and Event are published.

`show_cancellation_requests` preserves a Producer's recommendation separately
from final authority. A request does not change lifecycle. Cancellation stores
its actor, reason, and time on `shows`, uses the reviewed lifecycle as its
optimistic-concurrency expectation, and preserves Operational Approval,
Proposal Revisions, decisions, cast credits, Publication, and activity. Future
Occurrence and reservation state is ended transactionally. A published
cancelled Event remains eligible for `get_published_event`; an unpublished
cancelled Event does not become anonymously visible.

Each Cast relationship initializes `public_credit_enabled` from the Member's
profile preference, then remains independently controllable for that Event.
Revision credit rows snapshot display names and permissions. Anonymous policies
return only permitted credits from the revision referenced by the Event's
published snapshot.

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

Proposal submission, review decisions, and Counteroffers are executable. Submission validates authorization,
Proposed Cast eligibility, chosen slots, required availability, Performance
Minimum Viable Cast, and buffered approved Primary Venue conflicts before it
writes one immutable snapshot and durable submission event.

`show_counteroffers` identifies the exact offered slot, Reviewer, target
revision and deadline. `show_availability_requests` records unevaluated-slot
requests for the Proposed Cast. `show_schedule_reservations` uses a database
exclusion constraint over setup/turnover-buffered ranges to prevent overlapping
active holds and approved Primary Venue commitments. Explicit decline and
idempotent expiry release the hold and return the revision to review; explicit
viable acceptance updates the working plan and submits the next pending
immutable revision without granting Operational Approval or Publication.

Operational-plan edits replace the supplied plan shape transactionally while
preserving supplied Occurrence, Candidate Slot, and resource-request
identifiers. Omitted children are removed, ordering is explicit, and every
successful save emits `event.operational_plan.updated`. Only a currently
eligible assigned Producer may save. Draft plans remain editable; an approved
plan may also be edited, but changes within Operational Approval scope
atomically clear the current approved-revision pointer, return the Event to
draft, and require a new Proposal Revision.

## Active Sources

- `CONTEXT.md`
- `docs/data/data-model.md`
- `docs/product/event-publication-milestone.md`
- `supabase/migrations/`

## Generated Types

The generated TypeScript schema lives at `src/server/db/database.types.ts`.
Regenerate it from the authoritative remote schema with `npm run db:types`.
