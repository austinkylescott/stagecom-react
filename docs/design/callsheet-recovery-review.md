# Callsheet read recovery (STA-80)

October 22, 2026. Implements the recovery slice of the approved STA-76 specification.

## Behavior

A failed full Callsheet read stays inside the workspace shell. **Retry Callsheet**
invalidates the Callsheet route and preserves its location, including the
Confirmed Calls anchor. Repeated failure restores the same usable controls;
pending work initially disables retry and says **Retrying Callsheet…**. A slow
route invalidation displays **Preparing your Callsheet** without a second retry
control until the read settles. **Open Notifications**
provides another authenticated destination without loading the failed Callsheet.

An unauthenticated read offers **Sign in again**, preserving the intended
Callsheet location in `next`. A forbidden read explains the access restriction
and offers Notifications without suggesting that retry grants access. Service
and transport failures show unavailable data, never the successful empty view.

The desktop Your Next Events list and phone agenda disclosure share their own
retry result. **Retry Events** calls only the upcoming-Calls read. It neither
invalidates nor depends on the failed full Callsheet. A new route load supersedes
previous agenda retry results. This direct read matters because TanStack Router
can reload an errored child even when invalidation filters select its parent.

## Verification and limits

`e2e/callsheet-recovery.spec.ts` injects deterministic results at existing
app-owned browser read boundaries. It exercises the actual router, shell,
Callsheet loader, retry controls and Notifications navigation. Auth, membership,
Callsheet, agenda and Notifications read responses are controlled fixtures;
these checks establish browser recovery behavior, not real Auth/database
integration. The Vite development RPC IDs identify exports; no production test
hooks or shared database mutations are introduced.

The initial test against the original route failed because **Retry Callsheet**
did not exist. The rendered recovery was:

```text
Your workspace is still safe
Stagecom could not load this area right now. Return to Callsheet, then try again.
Return to Callsheet → /app/callsheet
```

The recovery suite covers typed service failure, aborted transport, repeated
failure, pending retry, successful current data, empty data, authentication,
forbidden access, alternate navigation, and independent agenda recovery. Desktop
1280px and phone 390px checks use keyboard activation and verify the visible
focus ring and capture failure/recovered views:

| View    | Failure                                                       | Recovered                                                        |
| ------- | ------------------------------------------------------------- | ---------------------------------------------------------------- |
| Desktop | [Focused retry](callsheet-recovery-evidence/failure-1280.png) | [Confirmed Call](callsheet-recovery-evidence/recovered-1280.png) |
| Phone   | [Focused retry](callsheet-recovery-evidence/failure-390.png)  | [Confirmed Call](callsheet-recovery-evidence/recovered-390.png)  |

Screenshots and automated checks are implementation evidence. Maintainer,
uncoached-user, physical-device and branding acceptance remain separate.
Local Supabase was not running and no database credentials were configured, so
database-backed browser journeys remain unverified in this environment.

Executed checks:

- Typecheck and production build passed; formatting and diff whitespace passed.
- Full Vitest suite: **199 passed, 6 skipped** (database/demo configuration absent).
- Full Playwright suite: **12 passed, 54 skipped**, including all **7 recovery
  scenarios**. The skips require local Supabase or the optional demo dataset.
  Chromium ran with the environment's existing local Playwright configuration.
- Changed-file ESLint could not run: this checkout lacks the declared
  `@shadcn/lint` package. A dependency-install attempt did not complete; no
  dependency manifest or lockfile changes are included.
- Separate Standards and Spec reviews found **0 actionable findings** each.
