# Auth Flow Plan

Status: active rebuild plan

## Summary

Use Supabase magic-link auth with intent-aware redirects. Preserve user intent, but recover safely when intent is stale or missing.

## Redirect Priority

1. Invite acceptance intent.
2. Missing required profile field.
3. Explicit valid `next` route.
4. Incomplete draft theater setup.
5. Existing app membership/default callsheet.
6. `/onboarding`.

## Routes

- `/signup`: new-user magic-link page.
- `/login`: returning-user magic-link page.
- `/auth/callback`: completes session and resolves redirect.
- `/complete-profile`: collects display name.
- `/join/$inviteToken`: accepts invite or starts auth with invite intent.
- `/logout`: clears browser/server auth state and redirects to `/`.

## Protected Routes

- Unauthenticated `/app/*` redirects to `/login?next=...`.
- Protected loaders verify session server-side.
- Server functions and commands still authorize independently.

## Invite Rules

- Token must be valid, unexpired, unused, and email-specific.
- Signed-in email must match invited email.
- Acceptance creates/updates membership, marks invite accepted, and emits activity.

## Logout

Logout redirects to `/`.

## Implementation Notes

- Browser auth uses Supabase magic-link PKCE.
- `/auth/callback` exchanges the Supabase callback code, stores the browser session, and mirrors the access token into an HTTP-only server cookie for protected loaders/server functions.
- `/app/*` checks the server cookie through `getCurrentUserFn` and redirects unauthenticated users to `/login?next=...`.
- Invite intent is preserved through `/login`, `/signup`, and `/auth/callback`, then resolved back to `/join/$inviteToken`.
- Redirect resolution is implemented as a tested helper so the priority stays explicit.

## Abuse

Rely on Supabase/email provider throttling initially, but show clear cooldown/retry messaging.
