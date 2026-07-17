# Foundation Slice Spec

Status: partially implemented foundation specification

The foundation slice turns the rebuild plans into a coherent workflow: auth, onboarding, Theater setup, public preview, and published public Theater home. It is a prerequisite for, but not the definition of, the first meaningful Event-publication milestone in `docs/product/event-publication-milestone.md`.

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

## Implementation Reality

Persistent Theater creation, Owner membership, setup persistence, private preview, explicit Publication, default-Theater selection, and anonymous published-only rendering are implemented through the app-owned command/query boundary. Creation and Publication are idempotent transactional operations with factual activity events.

Targeted Invitation creation, revocation, intent-preserving authentication, and
idempotent base-Member acceptance are implemented through the app-owned
command/query boundary. Reusable Join Links remain a later membership slice.
