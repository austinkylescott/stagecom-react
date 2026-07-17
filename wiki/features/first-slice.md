# Foundation Slice

Documentation status: active

Implementation status: partially implemented

The foundation slice proves the rebuilt app shape through auth, onboarding, Theater setup, preview, and public Theater publishing. It is necessary infrastructure, but it is not Stagecom's first meaningful product win by itself. That milestone is described in `wiki/features/event-publication-milestone.md`.

## Workflow

1. User signs up or logs in with Supabase magic link.
2. User completes a display name if needed.
3. User chooses to create a Theater or join through a link.
4. Theater setup creates a draft theater and owner membership.
5. Owner/admin previews the public theater home.
6. Owner/admin publishes when required fields are complete.
7. Anonymous visitors can view `/theater/$theaterSlug`.

## Required Pages

- `/signup`
- `/login`
- `/auth/callback`
- `/complete-profile`
- `/join/$inviteToken`
- `/onboarding`
- `/onboarding/theater`
- `/app/$theaterSlug/preview`
- `/theater/$theaterSlug`

## Current Implementation Reality

Database-backed Theater creation now atomically establishes the first Owner membership and factual creation event. Owners can persist the required public identity, preview the anonymous-safe result, publish explicitly, and choose a default Theater for navigation. The public Theater route now uses a published-only anonymous query rather than demo state, and Publication writes a durable factual event without duplicating it on retry.

Targeted Invitation creation, revocation, intent-preserving authentication, and
idempotent base-Member acceptance are implemented. Reusable Join Links and the
broader multi-user Event workflow remain outside this foundation slice.

## Acceptance Sources

- `docs/specs/first-slice.md`
- `docs/rebuild/05-first-slice-page-specs.md`
- `docs/rebuild/07-auth-flow.md`
- `docs/rebuild/08-acceptance-tests.md`
