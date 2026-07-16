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

Route shells, local form behavior, demo public rendering, and smoke tests exist. Database-backed Theater creation, setup persistence, invitation acceptance, publication, and anonymous published-only reads remain incomplete or explicit `notImplemented` stubs.

## Acceptance Sources

- `docs/specs/first-slice.md`
- `docs/rebuild/05-first-slice-page-specs.md`
- `docs/rebuild/07-auth-flow.md`
- `docs/rebuild/08-acceptance-tests.md`
