# API Contract Plan

Status: active rebuild plan

## Summary

Use TanStack Start server functions as thin typed adapters over feature-owned command/query modules. All mutations and private reads go through the app-owned layer.

## Organization

```txt
src/features/
  auth/
  onboarding/
  theaters/
  memberships/
  activity/
  notifications/
src/server/
  supabase/
  auth/
  errors.ts
  validation.ts
  schemas.ts
```

Feature modules should split:

- `commands.ts`: mutations and workflow writes.
- `queries.ts`: authenticated/private reads.
- `public-queries.ts`: anonymous-safe public reads.
- `schemas.ts`: Zod schemas.
- `server-functions.ts`: thin TanStack wrappers.

## Error Contract

Use a typed `AppError` envelope with safe public messages.

Standard codes:

```txt
validation_error
unauthenticated
forbidden
not_found
conflict
rate_limited
external_service_error
internal_error
```

## First-Slice Operations

- `getCurrentUser`
- `getOnboardingState`
- `createDraftTheater`
- `updateTheaterSetup`
- `uploadTheaterLogo`
- `getTheaterPreview`
- `publishTheater`
- `createTheaterInvite`
- `acceptTheaterInvite`
- `getMyTheaters`
- `getTheaterMembership`
- `getPublishedTheaterBySlug`
- `getPublishedTheaterEvents`

## Events

Commands call explicit helpers after successful writes:

```txt
emitActivity(...)
emitDomainEvent(...)
```

Do not create notifications directly from UI or route components.
