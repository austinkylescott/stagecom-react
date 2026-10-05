# Hosted delivery browser regression investigation

PR #73 originally changed delivery workflows and guidance, not application code.
Its first full CI run at `cbf6db6` reported 43 passes and four failures. The later
fast dev profile passed two smoke tests; it did not establish release readiness.

## Baseline comparison

The comparison point is `67cc05f` (PR #72), also the parent of the delivery work
and the base used in the failed CI merge. Between that baseline and `120fc53`,
`src/`, `e2e/`, `supabase/`, `playwright.config.ts`, `vite.config.ts`, and the
package manifest/lockfile were unchanged. No application regression introduced
by hosted delivery was identified.

The baseline's [verification record](../design/neutral-workspace-review.md)
reported a final fresh-seed run of 45 passes, one failure, and one skip, followed
by three passes of the corrected Callsheet test. It did not claim a repeated
fully green suite. Earlier runs also recorded authentication/navigation races
and a transient Join Link service failure. The hosted CI run uses the default
disposable stack, so its completion-fault test runs instead of being skipped.

## Reproduction and fixes

The investigation used an isolated local Supabase stack on ports 5632x, tracked
migrations, the CI demo password, Chromium, and one Playwright worker. No remote
schema, seed, data, deployment, or release was changed.

| Journey                       | Baseline evidence                                                                                                                                                                                      | Follow-up                                                                                                                                                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Targeted Invitation           | Normal baseline and PR runs failed at initial sign-in navigation. Sixfold browser CPU throttling reproduced CI's exact missing OTP request after the fixed 250 ms pause.                               | Wait for sign-in, email change, form submission, and acceptance handlers before interacting. OTP payload/redirect intent, callback, membership, history, and idempotency assertions remain.                                                            |
| Event portfolio return        | Original connected journey passed on both revisions; it also passed with sixfold CPU throttling. The CI artifact remains evidence of the intermittent failure, not a deterministic local reproduction. | Assert the exact destination URL with the existing 20-second navigation budget before asserting the destination heading. No automatic click retry or application navigation change.                                                                    |
| Reusable Join Link contenders | Baseline passed normally. Fifteenfold CPU throttling on the two contender pages reproduced CI's exact missing terminal outcome after the fixed 500 ms pause.                                           | Wait for both Join handlers before launching concurrent clicks. Retain exactly one success, one exhaustion outcome, one use, and one active membership assertions.                                                                                     |
| Theater Calendar              | Baseline reproduced the 120-second timeout. Its trace showed the test waiting for Back to Calendar after fault injection interrupted startup; URL change had preceded Event rendering.                 | Wait for the Event heading and hydrated return link before injecting the Calendar transport failure. Keep Retry Calendar, interruption-count, disclosure, persistence, return-context, and viewport checks. Bound actions/navigation to 10/20 seconds. |

The Calendar failure was not evidence that four personas inherently need a
larger total timeout. The 120-second budget and all personas remain unchanged.
Playwright now retains the first failing trace; the original configuration only
recorded a first retry, but CI did not request retries.

## Verification

Focused command (run after seeding the disposable story):

```bash
npm run test:e2e -- \
  e2e/acceptance.spec.ts e2e/neutral-review-journey.spec.ts \
  e2e/reusable-join-links.spec.ts e2e/theater-calendar.spec.ts \
  --grep 'recipient authentication|connected neutral review|acceptance is idempotent|persisted Theater Calendar' \
  --workers=1
```

- Original PR: one failure, three passes; baseline: two failures, two passes.
- Corrected focused run: four passes in 1.1 minutes.
- Fresh-seed serial full browser run: 45 passed, one failed, one skipped in
  four minutes. All four reported journeys passed. The unchanged
  `event-publication-milestone.spec.ts` failed waiting for `#cast-team` after a
  section click left `#schedule-plan`; its baseline rerun passed in 51 seconds and unchanged PR-branch rerun
  passed in 41 seconds. No additional milestone code was changed.
  The completion-fault injection test is intentionally skipped on this isolated
  non-default local stack. This is not a green full release verification.
- Slower-browser checks: corrected Targeted Invitation passed three times at
  sixfold CPU throttling; corrected concurrent Join Link passed three times at
  fifteenfold throttling. The original Join Link test fails at that same rate.
  Thirtyfold throttling exceeded the corrected test's existing five-second
  hydration budget; this diagnostic limit was not raised to make it pass.
- Typecheck, scoped ESLint, formatting, whitespace, and delivery policy: passed.
- Unit/integration suite: 59 files, 186 tests passed.
- Vercel build (`NITRO_PRESET=vercel npm run build`): passed without deployment.
- Fresh database acceptance: 28 files, 591 checks passed. Running these tests
  after demo seeding is invalid because several assert whole-database counts;
  reset only the isolated stack and follow CI's acceptance-before-seed order.

Browser slowdown was diagnostic-only: a temporary fixture called Chromium's
`Emulation.setCPUThrottlingRate` with rate 6 on each page, and rate 15 on the Join
Link contenders before navigation. No artificial slowdown or retries are added
to release verification.
