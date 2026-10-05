# Hosting and releases

Status (2026-10-05): PR #73 is merged into dev and hosted dev deployment is
enabled. Main (`00d4f1f`) still lacks the delivery workflows and Vercel Git
deployment configuration. This local bootstrap prepares those changes for
review; it does not publish or deploy them. Production database separation,
credentials, approval rules, branch protection and full verification remain
open. See [the release readiness audit](release-readiness.md).

## Environment layout

Use **one Vercel project**, `stagecom-react-dev`, with two hosted environments.
The project name does not determine which environment a deployment uses.
Vercel's Development environment is for local settings; the hosted dev site
uses Preview. No custom Vercel environment or second hosting project is needed.

| Site       | Source                                                    | Vercel environment               | Supabase                             | Demo access                                     |
| ---------- | --------------------------------------------------------- | -------------------------------- | ------------------------------------ | ----------------------------------------------- |
| Dev        | `dev` after fast CI passes                                | Preview, stable `dev` branch URL | Integration/review database          | Only after complete site protection is verified |
| Production | Approved, pinned `release/<version>` commit after full CI | Production, production domain    | Separate production database project | Disabled                                        |
| Main       | Observed release history                                  | No deployment                    | —                                    | —                                               |

Set Preview variables for branch `dev` and Production variables separately in
the same project. Both GitHub environments reference the same Vercel project ID
and organization ID. Separate Vercel environments do not isolate databases;
Supabase production remains separate from the integration database.

The documented Supabase integration project is `obufimjayisdhkjjxhfd`.
Inspect its current data and intended role before using it for persona review.
The older Vercel project `stagecom` is a separate Nuxt application and is not
part of this delivery setup.

The persona chooser grants real test-account sessions to visitors. Its server
password is not a visitor access gate. Protect the whole dev site, including
server-function requests, before setting `STAGECOM_DEMO_MODE=true`. If the
account plan cannot protect the stable URL, keep personas disabled until an
explicit access gate is implemented. Avoid sensitive real data in this site.

## Repository automation

- `ci.yml` validates names and PR targets, then calls `verify.yml`.
- Work branches are checked through PRs; direct pushes are checked on main,
  dev and release branches without an open full-profile PR. An open PR to main
  or a release owns its branch verification, avoiding duplicate full runs. This avoids running the same full suite twice for
  every work-branch update while still checking the integrated source.
- Dev PRs and dev pushes use fast verification: branch policy, typecheck, unit
  tests, Vercel build and the two existing home-page/sign-in-redirect browser
  tests. They do not start Supabase or run the full browser suite. Database-dependent
  tests remain outside this fast gate. This keeps the remote sandbox available
  for testing unfinished work; it does not establish release readiness.
- Release/main PRs and pushes, and explicit production deployments, use full
  verification: disposable local Supabase, tracked migrations, database acceptance
  tests, local review seed, unit/integration tests, Vercel build and the complete
  browser suite distributed over four independent disposable databases. Tests
  remain serial within each shard; the required verification gate demands core
  checks and every browser shard succeed. The reusable workflow defaults to full verification.
- After checks pass on a dev push, hosted dev deploys only when repository
  variable `HOSTED_DEV_ENABLED` is `true`.
- `release.yml` is manually dispatched with a release branch. It pins the
  branch's commit before verification; deployment uses that same SHA even if
  the branch changes while checks run. The workflow never merges into main.
- `deploy-vercel.yml` calls `scripts/deploy-vercel.sh` in the same Vercel project.
  Dev pulls Preview variables with `--git-branch=dev`, builds and deploys without
  `--prod`, and supplies GitHub branch/SHA metadata for branch URL assignment.
  Production pulls Production variables, checks demo mode is false and the demo
  password is absent, then builds and deploys with `--prod`. Both paths upload
  the verified source's prebuilt output.
- `vercel.json` disables Git deployments. GitHub checks alone do not prevent
  Vercel's independent auto-deploy path; keep this setting disabled.

Full CI uses only disposable local database credentials. No remote migrations or
remote seeding are part of these workflows. Full-regression failures prevent
production deployment; they do not gate the dev sandbox. Do not mask them to
obtain a green release gate.

The first full GitHub run passed database acceptance checks and all 186
unit/integration tests. Browser regression took 7 minutes 55 seconds: 43 passed
and four failed (Targeted Invitation magic-link request, connected review Event
portfolio navigation, Reusable Join Link outcome, and Theater Calendar timeout).
Switching dev to smoke coverage did not resolve these failures; the full release
profile still runs every journey. A controlled comparison with baseline `67cc05f`
found no application, dependency, migration, seed, or browser-test changes in the
original delivery PR. The follow-up fixes synchronize browser interactions with
hydration and destination rendering, and retain traces on the first failure.
See [the browser regression investigation](hosted-browser-regression.md) for
reproduction details, baseline limits, and focused verification.

## Account setup

1. Reuse `stagecom-react-dev` in `austin-scotts-projects`. Live read-only
   inspection confirmed access and a ready Production deployment. Configure
   TanStack Start, Node 24, `npm ci`, `npm run build` and `NITRO_PRESET=vercel`.
   Keep native Git deployments disabled, including main; the existing main-based
   deployment predates this policy and can remain until an approved release.
2. Configure a stable Preview domain assigned to Git branch `dev` in this project
   (or confirm Vercel's generated `dev` branch URL after the first Preview deploy).
   Keep the current Production domain assigned to Production. Set `VITE_APP_URL`
   to the matching stable URL in each environment. Configure and verify whole-site
   protection on the dev URL before enabling persona review.
3. Set Preview variables for `dev` and Production variables separately:
   `VITE_APP_TITLE`, `VITE_APP_URL`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`. Set `SUPABASE_SERVICE_ROLE_KEY` only as a server
   secret, pointing at the corresponding database. For Production set
   `STAGECOM_DEMO_MODE=false` and omit `STAGECOM_DEMO_PASSWORD`. Hosted servers
   use `NODE_ENV=production` for Secure Auth cookies. See the official
   [branch-aware prebuilt deployment commands](https://vercel.com/docs/cli/deploy)
   and [Preview variable pull](https://vercel.com/docs/cli/pull).
4. Configure GitHub environments `dev` and `production`. Both use
   `VERCEL_ORG_ID=team_5DinBWVxQJQbFt4CBlz5R5cZ` and
   `VERCEL_PROJECT_ID=prj_mJz3CpHMcBFKVz3lWawYLlgCoJgU`, with a
   `VERCEL_TOKEN` secret and exact `VERCEL_CLI_VERSION` variable in each.
   Select a published, validated CLI version; empty values, `latest` and ranges
   are refused. Store tokens through secret tooling, never in chat or git.
   The dev environment now has its token and all three variables, including
   CLI version `62.2.0`. GitHub also has an empty `Production` environment;
   its token, variables and protection rules remain to be configured. GitHub
   environment names are case insensitive, so reuse that environment.
5. Require maintainer review for the production GitHub environment where the
   repository's plan supports it. The selected source is a release branch,
   but the workflow can run from main: environment deployment-branch rules
   constrain the workflow ref, not the input source branch. Configure them
   accordingly; the workflow itself validates the release input.
6. Enable GitHub Actions and protect main, dev and `release/*` against unwanted
   direct pushes. Require the policy and verification checks reported by the
   first CI run. Require review for release-to-main incorporation. Retain an
   explicitly controlled mechanism for intentional dev resets.
7. Configure each Supabase project's Auth site URL and `/auth/callback` allow-list
   for its own site. Provision production separately and apply reviewed tracked
   migrations only after operation approval. Do not copy demo users/data into it.
8. Enable `HOSTED_DEV_ENABLED=true` only after secrets, target database and dev
   access protection are verified. Bootstrap the workflows into the canonical
   branch through a reviewed release/bootstrap operation before relying on the
   GitHub Actions manual-dispatch UI; do not pretend publishing is deployment.

This setup needs a CI deployment token even when the Vercel plugin is connected;
the plugin's OAuth connection does not automatically supply GitHub Actions secrets.

## Using the workflow

Create each new release from main, integrate approved work individually, and
run CI on the assembled candidate. In GitHub Actions select **Deploy release**,
enter `release/0.1.0` (or the intended version), and dispatch. Approve the
production environment after reviewing the pinned candidate and checks.

Record the deployment URL, SHA, release inventory and immutable tag, for example
`v0.1.0`. A hotfix redeployment gets a new immutable tag such as `v0.1.1`; do
not move an existing tag. Observe the release, then squash-merge it into main
before the next release as appropriate. Main updates never deploy.

## Rollback

Record known-good deployment IDs/URLs before each release. Roll back by pointing
the project’s Production domains to the chosen previous Production deployment; do not
deploy main as a rollback. With the correctly linked project and authenticated
CLI, the documented command is:

```sh
vercel rollback <known-good-deployment-url-or-id>
```

Record the operation and verify login, public presentation and an authorized
read. Keep the faulty release available for diagnosis. Alternatively, merge a
tested hotfix into the affected release and redeploy through **Deploy release**.
Carry fixes into any upcoming candidate before it is deployed.

App rollback does not undo database migrations. Use additive compatible changes
while the previous release must remain runnable. Treat incompatible migration
and recovery plans as separately reviewed operations.

## Linear integration

Configure generated names to omit the username and retain ID/title where the
available branch-format settings support it. Repo guidance supplies the type
prefix. No dynamic label-to-prefix capability has been assumed.

Configure Git workflow automation so dev/release merges do not mark tickets
Done. Use contributing PR references during assembly and closing references
only on final incorporation into main. Check actual target-specific settings
before enabling automation; otherwise update statuses deliberately.

## Verification evidence (2026-10-05)

The original delivery baseline was main `67cc05f`; current main is `00d4f1f`.
The browser investigation records its exact baseline and limits rather than
assuming today's main has the same contents.

- The browser follow-up passed all four focused journeys, 186 application tests,
  591 fresh-database acceptance checks, typecheck and the Vercel build.
- Its full browser run was 45 passed, one intermittent Event-publication failure
  and one skipped fault-injection test. This is not a green full release gate.
- Fast GitHub CI passed for browser follow-up `d9be772`; deployment was skipped.
- The single-project revision adds executable fake-CLI delivery checks for Preview
  branch variables/metadata, Production flags, unsafe demo settings and rejected
  source branches. These run in both verification profiles without a live deploy.
- Account setup, hosted dev smoke verification and a green full release run remain
  necessary before delivery. No merge, deployment, remote migration or seed is
  included in this revision.
