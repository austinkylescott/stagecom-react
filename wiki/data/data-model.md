# Data Model

Status: active synthesis

The rebuild keeps the existing Supabase schema as baseline and adds forward reset migrations.

## Key Decisions

- User-facing Events remain stored in the `shows` table for now.
- Theater-level rebuild roles are `owner`, `admin`, and `member`.
- Event-level roles are producer, staff assignment, and cast.
- Public theater pages depend on `theaters.status = published`.
- Theater invites use email-specific hashed tokens.
- Activity history is stored in `activity_events`.
- Event staff defaults are stored separately from per-event staff assignments.
- Simple public grouping/running order is supported by `show_acts`.
- Public media uses the `theater-assets` storage bucket.

## Active Sources

- `docs/data/data-model.md`
- `docs/rebuild/11-schema-delta-spec.md`
- `supabase/migrations/20260503192900_add_owner_theater_role.sql`
- `supabase/migrations/20260503193000_stagecom_rebuild_schema_delta.sql`
- `supabase/migrations/20260505110000_create_theater_assets_bucket.sql`
- `supabase/migrations/20260505112000_drop_legacy_show_cast_update_helper.sql`

## Generated Types

The generated TypeScript schema lives at `src/server/db/database.types.ts`. Regenerate it after applying local migrations with `npm run db:types`.
