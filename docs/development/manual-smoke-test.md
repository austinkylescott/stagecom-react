# Manual Smoke Test

Status: active testing checklist

This checklist preserves the current manual test journey for the implemented
Theater foundation. Replace `{theaterSlug}` with the slug created during setup.

## Current Checkpoint

- [x] 1. Open `/` and confirm the landing-page shell renders.
- [x] 2. Open `/dev/components` and review the design-system baseline.
- [x] 3. Open `/signup` and request a magic link.
- [x] 4. Follow the link through `/auth/callback` and establish a session.
- [ ] 5. Open `/complete-profile?next=/onboarding`, enter a display name, and
      continue to `/onboarding`.
- [ ] 6. On `/onboarding`, choose **Create theater**.
- [ ] 7. On `/onboarding/theater`, verify generated/editable slug behavior,
      complete the Theater identity fields, and select **Save and preview**.
- [ ] 8. On `/app/{theaterSlug}/preview`, confirm persisted data and publish the
      Theater.
- [ ] 9. On `/app/{theaterSlug}/settings`, edit and persist Theater identity.
- [ ] 10. On `/app/callsheet`, confirm personal Event commitments appear above
      Theater selection, retain their Theater/Event/relationship labels, and
      lead to the relevant Event action. Confirm the no-commitments state still
      provides Theater selection.
- [ ] 11. Open `/theater/{theaterSlug}` anonymously and confirm the published
      Theater is visible. Confirm an unpublished or unknown slug is not found.

Resume at step 5.

## Additional Checks

- While signed out, open `/app/callsheet` or `/app/{theaterSlug}` and confirm it
  redirects to `/login` with the intended destination preserved.
- Open `/join/valid-invite-token-1234567890` and confirm sign-in/sign-up links
  preserve the token. Invitation acceptance is not implemented yet.

## Placeholder Routes

These routes exist for navigation and layout testing, but their product
workflows are not implemented:

- `/app/{theaterSlug}`
- `/app/{theaterSlug}/members`
- `/app/{theaterSlug}/events`
- `/app/{theaterSlug}/events/new`
- `/app/{theaterSlug}/events/{eventSlug}`
- `/theater/{theaterSlug}/{eventSlug}`

## Hosted Runtime

Configure `.env.local` with the hosted Stagecom Supabase URL, publishable key,
and service-role key, then run the app with `npm run dev`. Magic links are sent
through hosted Supabase to the requested email address. Request a fresh link
for each test; callback authorization codes are single-use.
