# Route Map Plan

Status: active rebuild plan

## Summary

Use explicit public theater routes under `/theater` to avoid root-level slug collisions. Keep authenticated workspace routes compact under `/app/$theaterSlug`.

## Routes

```txt
/
/signup
/login
/auth/callback
/logout
/complete-profile
/join/$inviteToken

/onboarding
/onboarding/theater

/app/callsheet

/app/$theaterSlug
/app/$theaterSlug/events
/app/$theaterSlug/events/new
/app/$theaterSlug/events/$eventSlug
/app/$theaterSlug/members
/app/$theaterSlug/settings
/app/$theaterSlug/preview

/theater/$theaterSlug
/theater/$theaterSlug/$eventSlug

/dev/components
```

## Page Jobs

- `/app/callsheet`: My Callsheet across theaters.
- `/app/$theaterSlug`: Theater Callsheet / operator dashboard.
- `/app/$theaterSlug/events`: theater event operations list.
- `/app/$theaterSlug/events/new`: theater-scoped event builder.
- `/app/$theaterSlug/events/$eventSlug`: event admin/workspace page.
- `/app/$theaterSlug/members`: member and invite management.
- `/app/$theaterSlug/settings`: theater identity, branding, address, staff/event defaults.
- `/app/$theaterSlug/preview`: authenticated public theater preview.
- `/theater/$theaterSlug`: published public theater home.
- `/theater/$theaterSlug/$eventSlug`: published public event page.

## Visibility

- `/app/*` requires auth.
- `/app/$theaterSlug/*` requires active membership.
- Owner/admin actions are enforced in APIs and page modules.
- Public theater routes only resolve published theaters/events.
- Draft previews stay under `/app/$theaterSlug/preview`.
