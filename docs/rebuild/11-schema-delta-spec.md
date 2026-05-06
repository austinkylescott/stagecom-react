# Exact Schema Delta Specification

Status: active rebuild plan

## Theater Lifecycle

Implemented by:

- `supabase/migrations/20260503193000_stagecom_rebuild_schema_delta.sql`

Add enum:

```txt
theater_status: draft, published, archived
```

Add to `theaters`:

```txt
status theater_status not null default 'draft'
published_at timestamptz null
social_links jsonb not null default '{}'
timezone_source enum/text default 'unknown'
```

Timezone source values: `unknown`, `inferred`, `manual`.

Indexes:

- `idx_theaters_status` on `theaters(status)`.
- `idx_theaters_published` on `theaters(slug)` for published theaters.

## Roles

Add `owner` to `theater_role`.

New product logic uses `owner`, `admin`, `member`. Existing `manager`, `staff`, and `instructor` are legacy only and should not be assigned by new UI. New helpers should not grant privileges to legacy roles.

Implemented helpers:

- `is_theater_admin(theater_id)`: true for active `owner` or `admin`.
- `is_theater_owner(theater_id)`: true for active `owner`.
- `is_theater_staff(theater_id)`: preserved for baseline policy compatibility, but redefined to owner/admin semantics.

The obsolete six-argument `can_update_show_cast` overload is removed by `supabase/migrations/20260505112000_drop_legacy_show_cast_update_helper.sql`; the rebuild uses the seven-argument helper that includes `act_id`.

## Invites

Add `invite_status`: `pending`, `accepted`, `revoked`, `expired`.

Add `theater_invites` with theater, email, role, token hash, status, inviter, accepted user, expiration, accepted timestamp, created/updated timestamps.

Store token hashes only. Default expiration: 14 days.

Indexes:

- `idx_theater_invites_theater_status` on `(theater_id, status)`.
- `idx_theater_invites_email_theater` on `(lower(email), theater_id)`.

## Activity

Add `activity_visibility`: `admin_only`, `member_visible`, `self_only`.

Add `activity_events` with theater, entity type/id, actor, action, visibility, payload, and created timestamp.

Indexes:

- `idx_activity_events_theater_created` on `(theater_id, created_at desc)`.
- `idx_activity_events_entity_created` on `(entity_type, entity_id, created_at desc)`.
- `idx_activity_events_actor_created` on `(actor_user_id, created_at desc)`.

## Staff Defaults

Add `theater_staff_slot_defaults`.

Slot types:

```txt
lead
front_of_house
box_office
bar
tech
other
```

Scope defaults by `event_type`. Store label, minimum count, recommended count, position, active state.

Rules:

- `recommended_count >= minimum_count`.
- Unique by `(theater_id, event_type, slot_type, label)`.
- `show_staff_assignments.assignment_type` is constrained to the same slot values.

## Acts

Add `show_acts` with show, title, description, position, timestamps.

Add nullable `show_cast.act_id`.

One cast member belongs to one act in v1. `show_cast.program_order` means order within act when `act_id` exists. Show-type events should get a default act through app command logic.

Indexes:

- `idx_show_acts_show_position` on `(show_id, position)`.
- `idx_show_cast_act` on `(act_id, program_order)`.

The `show_acts` table has a unique `(show_id, position)` constraint for deterministic running order. Reordering should be done through app commands that update positions coherently.

## RLS Intent

- Public theater read: published only.
- Invite mutation/read: owner/admin only; token acceptance through app command.
- Activity read: based on visibility.
- Staff default mutation: owner/admin only.
- Acts/cast mutation: producer can manage cast/acts; owner/admin can override.
- Staff assignment mutation: owner/admin only by default.
