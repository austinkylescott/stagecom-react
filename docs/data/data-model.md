# Data Model

Status: active synthesis

The executable schema baseline lives in `supabase/migrations/`. The active schema delta plan lives in `docs/rebuild/11-schema-delta-spec.md`.

## Current Baseline

The rebuild starts from the existing Supabase schema:

- profiles
- theaters
- theater_memberships
- shows
- show_roles
- show_occurrences
- show_cast
- show_review_events
- show_staff_assignments
- notifications
- email_outbox

## Reset Additions

The first rebuild delta is represented by:

- `20260503192900_add_owner_theater_role.sql`
- `20260503193000_stagecom_rebuild_schema_delta.sql`
- `20260505110000_create_theater_assets_bucket.sql`
- `20260505112000_drop_legacy_show_cast_update_helper.sql`

It adds:

- theater publication lifecycle with `theater_status`, `theaters.status`, and `theaters.published_at`
- theater branding/social metadata with `theaters.social_links`
- timezone provenance with `timezone_source`
- `owner` as the new top theater authority role
- email-specific theater invites with hashed tokens
- general activity history through `activity_events`
- event staff defaults through `theater_staff_slot_defaults`
- simple acts/running order through `show_acts` and `show_cast.act_id`
- a public `theater-assets` storage bucket
- removal of the legacy six-argument `can_update_show_cast` helper overload

## Role Model

The rebuild product model uses:

- theater roles: `owner`, `admin`, `member`
- event roles: producer, staff assignment, cast

Legacy theater role enum values may still exist in the baseline schema, but new rebuild UI should not assign `manager`, `staff`, or `instructor`.

## Events Naming

User-facing Events are stored in the existing `shows` table for now. Do not rename the database table unless a future migration explicitly chooses that cost.

## Public Data Boundary

Public theater pages use anonymous-safe public queries. A theater is publicly readable when `theaters.status = 'published'`. Draft and archived theaters remain behind authenticated owner/admin/member access.

## Invites

Theater invites are email-specific and store token hashes only. Invite acceptance goes through app command logic so the app can validate token status, email match, expiration, membership changes, and activity events together.

## Activity And Notifications

Activity history uses `activity_events` with explicit visibility. Notifications must originate from explicit domain events; UI code should not create notification rows directly.

## Generated Types

Generated Supabase types are committed at `src/server/db/database.types.ts`. Regenerate them after local schema migrations with:

```bash
npm run db:types
```
