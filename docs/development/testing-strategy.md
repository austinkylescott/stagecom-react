# What Stagecom tests, and why

## The decision each gate supports

| Gate                     | Question                                                                           | Where to see the answer                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Application and database | Do authorization, state transitions and durable records obey the product contract? | Core CI job: application assertions and database acceptance output.                                |
| Browser regression       | Can a Member actually complete the supported workflows through the interface?      | Four browser jobs: live named tests and summary tables explaining purpose, result and duration.    |
| Release eligibility      | Was this exact commit fully verified?                                              | Release resolve job: commit SHA and linked successful CI run; an artifact receipt must match both. |
| Deployment smoke         | Did this deployment boot with working public pages and route protection?           | Four named smoke checks in the Production deployment job.                                          |

Full verification happens before release dispatch. Dispatch reuses a successful
full CI receipt for the exact source SHA; it cannot use dev smoke results, a
different commit, an unfinished run or a failed run. Missing or expired evidence
stops dispatch with an explanation. Full CI now checks the actual PR head commit,
not GitHub's temporary merge SHA. Branch protection must require an up-to-date
base, and dispatch requires the release to contain current main.

Production smoke is read-only and has a 60-second browser budget. It checks the
homepage, sign-in without demo controls, private Callsheet redirect with preserved
intent, and anonymous programming. It does not create production test accounts,
send email or mutate production data. It does not establish that a real person's
magic-link delivery or authenticated production workflow works. Those remain
account setup and observation responsibilities.

If Vercel protects Production, configure an environment-scoped automation bypass
secret for the smoke runner. The runner sends it only to the production origin;
it does not disable site protection or send it to third-party assets.

## Current coverage

The verified baseline has 186 application assertions across 59 files and 591
database acceptance assertions across 28 files. The browser suite has 47 named
tests across these 18 files. A browser test is often a multi-step journey, not a
single assertion; test counts alone do not describe coverage.

| Browser file                          | Tests | What it establishes                                                                                                                         |
| ------------------------------------- | ----: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `acceptance.spec.ts`                  |     8 | Authentication intent, session callback, profile completion, Theater setup and governed invitations; also a development component baseline. |
| `availability-polls.spec.ts`          |     3 | Explicit poll participants, drafts/resubmission, authorized reads and submit/close races.                                                   |
| `callsheet-workspace.spec.ts`         |     4 | Real persona sign-in, personal actions, multiple Theaters and persistent Calls.                                                             |
| `event-cancellation.spec.ts`          |     4 | Cancellation approval and public notice, release of commitments, watch-only exceptions and automatic completion recovery.                   |
| `event-cast-invitations.spec.ts`      |     3 | Role-specific disclosure, reviewed Team recipients, consent and atomic invitation batches.                                                  |
| `event-portfolio.spec.ts`             |     1 | Filtering and private visibility for Operators and Members.                                                                                 |
| `event-publication-milestone.spec.ts` |     1 | A nine-person, end-to-end journey from Theater creation through Event planning, casting, Review and public admission.                       |
| `home.spec.ts`                        |     2 | Homepage rendering and anonymous private-route redirect. These are the fast dev browser gate.                                               |
| `managed-event-governance.spec.ts`    |     1 | Producer eligibility, managed Event creation and explicit collaborator roles.                                                               |
| `neutral-review-journey.spec.ts`      |     2 | Six personas across workspace pages and three viewport widths, plus Notification transport recovery.                                        |
| `planning-confirmations.spec.ts`      |     1 | Persistent confirmed planning, exact Review context and atomic replacement.                                                                 |
| `proposal-revisions.spec.ts`          |     5 | Proposed Cast, immutable Review, author/reviewer distinction, held Counteroffers, risk after Cast withdrawal and Member deactivation.       |
| `public-programming.spec.ts`          |     3 | Public disclosure, posters, sign-in return identity, private working copy and recovery/loading states.                                      |
| `reusable-join-links.spec.ts`         |     2 | Link rotation/revocation, terminal states, retries and concurrent use limits.                                                               |
| `team-authority.spec.ts`              |     2 | Accepted Team Admin authority, successor consent, stale requests and accountable ownership recovery.                                        |
| `teams.spec.ts`                       |     3 | Independent Team membership, personal acceptance/leave, private reads and concurrent departure.                                             |
| `theater-calendar.spec.ts`            |     1 | Calendar periods, private detail boundaries, persisted state and Occurrence return context.                                                 |
| `theater-navigation.spec.ts`          |     1 | Theater identity and recognizable Event entry across personas.                                                                              |

## Why the old gate was slow and opaque

The first bootstrap browser runs took 9m 23s and 11m 6s, serially. Supabase setup
added about two minutes, including unused services and an image-pull retry.
Database acceptance, application tests and build together took about 20 seconds.
Failures spent approximately 29 seconds waiting on disabled buttons after a
fixed-delay interaction ran before hydration. Logs lacked passing-test timings.

Four independent CI databases reduced the first follow-up to 7m 4s, with 46
browser passes and one failure. Its browser shards took 106, 158, 221 and 185
seconds. The broad neutral workspace review alone took 116 seconds. These
measurements explain the current cost; they are not a reason to rerun everything
after a release commit has already passed full CI.

## Follow-up test design

Keep domain combinations and concurrency rules at database/application seams.
Several current Playwright tests already use only RPC calls; migrate those to
the existing integration layer rather than treating them as browser journeys.
The 591 database assertions remain essential and inexpensive once the stack starts.

Replace the nine-person milestone with focused journeys that each establish one
user-visible contract, retaining a small connected publication smoke. Preserve
cross-role authorization evidence in lower-level tests. This needs a coverage
mapping before removing assertions; a smaller test count is not proof of an
equivalent gate.

Give the six-person, three-viewport screenshot review its own clearly named
review workflow. Retain useful responsive and accessibility assertions in focused
UI checks. Collect exhaustive screenshots for deliberate visual review, rather
than obscuring ordinary functional feedback with an unlabelled walkthrough.

Those test migrations are proposed follow-up work. The current patch retains all
47 browser tests, removes fixed sleeps at observed failures, isolates shards,
publishes explanatory timing summaries, and removes repeated regression from
release dispatch. No assertion is silently removed to make the gate green.
