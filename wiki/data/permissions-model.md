# Permissions Model

Status: active synthesis

Stagecom permissions are contextual. The rebuild simplifies theater-level roles while preserving event-level relationships.

## Theater Roles

- `owner`: final theater authority and future billing/destructive-settings owner.
- `admin`: manages theater workspace, members, events, review/publishing, and event staff defaults.
- `member`: belongs to a theater, can propose events, be cast, and be assigned event staff.

Legacy enum values from the old schema are not assigned by new UI.

## Event Roles

- producer: manages event content, cast, acts, and proposal details.
- staff assignment: one-off event role assigned by owner/admin.
- cast: explicit `show_cast` membership only.

## Invariants

- Producers are never assumed to be cast.
- Cast membership requires an explicit `show_cast` row.
- Producers do not manage event staff assignments by default.
- Owner/admin publishes public theater and event surfaces.

## Authorization Boundary

All mutations and private reads go through app-owned server functions/commands. Service-role Supabase clients are allowed only in server code after explicit app-level authorization.

## Public Read Boundary

Public theater/event queries must use separate anonymous-safe public query modules. Draft and archived theater data is not public.
