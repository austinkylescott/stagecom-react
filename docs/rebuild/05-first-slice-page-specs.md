# First Slice Page Specs

Status: active rebuild plan

## Summary

The first product slice covers auth, onboarding choice, theater setup, public preview, and published public theater home.

## Auth

- `/signup`: magic-link signup, new-user copy, then display-name completion if needed.
- `/login`: magic-link login, returning-user copy, supports protected-route `next`.
- `/auth/callback`: completes Supabase session and resolves redirect.
- `/complete-profile`: required display name only.

## Invite

- `/join/$inviteToken`: accepts email-specific theater invites.
- Unauthenticated users go through auth with invite intent.
- Email mismatch blocks and explains recovery.
- Expired/used/invalid links show recovery state.

## Onboarding

- `/onboarding`: choice hub with Create theater and Join theater cards.
- Resume incomplete draft theater setup as primary action.
- Joining requires invite link in v1.

## Theater Setup

- `/onboarding/theater`: one-route stepper with autosave.
- Creates draft theater and owner membership.
- Required to publish: name, tagline, structured address, unique slug, resolved timezone.
- Optional: logo, website URL, social links.
- Slug auto-generates from name and is editable before publish.
- Address uses structured fields first; autocomplete can be added later.

## Preview And Public Home

- `/app/$theaterSlug/preview`: authenticated owner/admin preview, same renderer as public page, actions publish/edit/add event.
- `/theater/$theaterSlug`: published public theater home only.
- Public home shows poster-like identity header, location/directions, website/social links, and upcoming programming or coming-soon state.
