# First Slice

Status: active synthesis

The first product slice proves the rebuilt app shape through auth, onboarding, theater setup, preview, and public publishing.

## Workflow

1. User signs up or logs in with Supabase magic link.
2. User completes a display name if needed.
3. User chooses to create a theater or join by invite.
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

## Acceptance Sources

- `docs/specs/first-slice.md`
- `docs/rebuild/05-first-slice-page-specs.md`
- `docs/rebuild/07-auth-flow.md`
- `docs/rebuild/08-acceptance-tests.md`
