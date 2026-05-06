# Stagecom PRD

Status: active synthesis

Stagecom is being rebuilt as a theater-ops-first SaaS product for improv theaters, comedy theaters, indie venues, and community arts spaces.

The first rebuild is not a generic social network for performers. It is an operations product for theater owners/admins who need a credible public presence and a calmer internal workflow for programming, people, and event coordination.

## Product Promise

Stagecom helps a theater run its public-facing programming and internal event logistics from one trusted source of record.

## First Customer

The primary customer for the rebuild is a theater operator/admin. Performer and producer workflows matter, but the first product center is the person responsible for the theater's public identity, publishing, member access, and coordination quality.

## First Slice

The first rebuilt slice covers:

- magic-link signup/login
- profile completion
- onboarding choice
- theater setup
- public preview
- published public theater home

The first visible product win is letting an operator create, preview, and publish a credible public theater home.

## Product Language

Use Events in user-facing copy for shows, practices, meetings, auditions, workshops, and similar scheduled programming.

Keep the database table name `shows` until a future migration explicitly chooses the cost of renaming it.

## Role Principles

- Roles are contextual, not global user types.
- Theater-level rebuild roles are `owner`, `admin`, and `member`.
- Producers are event-level roles.
- Producers are never assumed to be cast.
- Cast membership requires an explicit cast row.
- Event staff assignments are separate from producer and cast relationships.

## Trust And Privacy

Theater operators need clear authority over what becomes public. Public pages only read anonymous-safe published data. Member, invite, cast, staff, and activity workflows require explicit authorization through the app-owned API/server-function layer.

## Business Direction

Stagecom is hosted SaaS first. Keep the architecture self-host-compatible later by avoiding unnecessary hosted-only assumptions in core product logic, but do not optimize the first slice around self-hosting.

## Non-Goals For The First Slice

- billing and subscription management
- realtime chat
- generic public join requests
- team/troupe modeling
- multi-location venue management
- renaming `shows` to `events`
