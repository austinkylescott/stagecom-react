# Database Delta Plan

Status: active rebuild plan

## Summary

Keep the current Supabase/Postgres schema as the baseline. Do not rename the `shows` table to `events`; product UI can use Events while the database remains stable.

## Keep As-Is

- `profiles`
- `theaters` core identity/location fields
- `theater_memberships`
- `shows` as DB table for product Events
- `show_roles`
- `show_occurrences`
- `show_cast`
- `show_review_events`
- `show_staff_assignments`
- `notifications`
- `email_outbox`
- profile visibility and field visibility model

## Add / Change

- Theater lifecycle: `theaters.status`, `theaters.published_at`.
- Theater branding: `theaters.social_links`.
- Timezone provenance: `theaters.timezone_source`.
- Owner role compatibility: add `owner`; new product logic uses `owner`, `admin`, `member`.
- Theater invites: email-specific token-hash invites.
- Activity history: general `activity_events`.
- Acts/running order: `show_acts`, nullable `show_cast.act_id`.
- Event staff defaults: `theater_staff_slot_defaults`.

## Permission Updates

- Theater roles: `owner`, `admin`, `member`.
- Event roles: producer, staff assignment, cast.
- Producers manage event content/cast/acts, not event staff assignments by default.
- Theater admins manage staff assignments and staff-slot defaults.
- Existing helper names like `is_theater_staff` should be replaced or reinterpreted as owner/admin checks.

## Defer

- Renaming `shows` to `events`
- team/troupe tables
- generic public join requests
- billing/subscription tables
- realtime chat
- multi-venue theater locations
