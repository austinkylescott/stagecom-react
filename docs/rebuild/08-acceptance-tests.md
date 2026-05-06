# Acceptance Tests And Build Milestones

Status: active rebuild plan

## Definition Of Done

- New user signs up with magic link.
- Display name is collected if missing.
- User creates draft theater.
- Owner membership is created.
- Setup autosaves.
- Required fields validate.
- Slug is generated, editable, and unique.
- Address is stored.
- Timezone is inferred or fallback is shown.
- Optional branding/socials can be skipped.
- Preview and public page share renderer.
- Owner/admin can publish.
- Anonymous visitors can view published theater home.
- Draft theaters are hidden publicly.
- `/dev/components` exists.
- Docs/wiki reflect implementation.

## Test Strategy

- Command/query unit tests for business logic.
- One core Playwright E2E journey for signup/setup/preview/publish/public view.
- Manual smoke pass for real auth UX, invite states, responsive layout, and visual coherence.

Current automated coverage:

- Unit tests for typed errors, validation, and auth redirect priority.
- Playwright smoke for `/`, unauthenticated `/app/*` auth redirect with `next`, `/dev/components`, onboarding setup required fields/slug behavior, public theater page demo rendering, invite intent preservation, and profile form gating.

Deferred until implementation slices land:

- Real Supabase magic-link round trip.
- Draft theater creation and owner membership creation.
- Autosave persistence.
- Slug uniqueness against the database.
- Timezone inference.
- Publish command and anonymous published-only database reads.
- Deterministic Supabase seed users/invites/theaters for full journey tests.

## Required Checks

```txt
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

## Milestone Order

1. Repo foundation and docs.
2. Database delta.
3. Design foundation.
4. Server foundation.
5. Auth and profile completion.
6. Invite flow.
7. Theater setup.
8. Preview and publish.
9. Verification hardening.

## Seed Data

Include deterministic demo data for owner/admin user, draft theater, published theater, no-event theater, branding present/missing states, and valid/expired/accepted invites.

Seed-data implementation is deferred until the theater setup, invite flow, and publish commands are backed by database writes.
