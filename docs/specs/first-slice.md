# First Slice Spec

Status: active synthesis

The first product slice turns the rebuild plans into a coherent workflow: auth, onboarding, theater setup, public preview, and published public theater home.

## Routes

- `/signup`: magic-link signup.
- `/login`: magic-link login with protected-route intent.
- `/auth/callback`: Supabase callback and redirect resolver.
- `/complete-profile`: display-name completion.
- `/join/$inviteToken`: invite acceptance entry point.
- `/onboarding`: create-or-join choice.
- `/onboarding/theater`: draft theater setup.
- `/app/$theaterSlug/preview`: owner/admin preview.
- `/theater/$theaterSlug`: published public theater home.

## Publish Requirements

A theater needs name, tagline, structured address, unique slug, resolved timezone, and publish action before anonymous users can view the public home.

## Permission Requirements

- Draft setup creates an owner membership.
- Owner/admin can preview and publish.
- Public theater page reads only published anonymous-safe data.
- Invite acceptance must validate token status, expiration, and invited email.

## Design Requirements

Use the design baseline in `docs/design/design-baseline.md`. Public pages should feel poster-like; authenticated setup should stay calm and operational.
