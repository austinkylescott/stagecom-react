# Hosting and releases

Status: repository configuration prepared; hosted account setup and first remote
workflow execution are pending. Baseline: GitHub main `67cc05f`, verified live
on 2026-10-05. No remote migration, seed, deployment or branch reset was performed.

## Environment layout

Use separate Vercel projects for hosted dev and production. Vercel may call each
project's stable URL a production deployment; only the Stagecom production
project is the real production environment.

| Site       | Source                                         | Supabase                             | Demo access                                            |
| ---------- | ---------------------------------------------- | ------------------------------------ | ------------------------------------------------------ |
| Dev        | `dev` after CI passes                          | Verified integration/review database | Only after complete site access protection is verified |
| Production | Explicitly selected `release/<version>` commit | Separate production project          | Disabled                                               |

The currently documented Supabase integration project is
`obufimjayisdhkjjxhfd`. Inspect its current data and intended role before using
it for hosted persona review. The existing Vercel project named `stagecom` may
belong to older work; inspect it before repurposing it. Do not assume the name
establishes the app source, environment or correct database.

The persona chooser grants real test-account sessions to visitors. Its server
password is not a visitor access gate. Protect the whole dev site, including
server-function requests, before setting `STAGECOM_DEMO_MODE=true`. If the
account plan cannot protect the stable URL, keep personas disabled until an
explicit access gate is implemented. Avoid sensitive real data in this site.

## Repository automation

- `ci.yml` validates names and PR targets, then calls `verify.yml`.
- Work branches are checked through PRs; direct pushes are checked on main,
  dev and release branches. This avoids running the same full suite twice for
  every work-branch update while still checking the integrated source.
- Dev PRs and dev pushes use fast verification: branch policy, typecheck, unit
  tests, Vercel build and the two existing home-page/sign-in-redirect browser
  tests. They do not start Supabase or run the full browser suite. Database-dependent
  tests remain outside this fast gate. This keeps the remote sandbox available
  for testing unfinished work; it does not establish release readiness.
- Release/main PRs and pushes, and explicit production deployments, use full
  verification: disposable local Supabase, tracked migrations, database acceptance
  tests, local review seed, unit/integration tests, Vercel build and the complete
  serial browser suite. The reusable workflow defaults to full verification.
- After checks pass on a dev push, hosted dev deploys only when repository
  variable `HOSTED_DEV_ENABLED` is `true`.
- `release.yml` is manually dispatched with a release branch. It pins the
  branch's commit before verification; deployment uses that same SHA even if
  the branch changes while checks run. The workflow never merges into main.
- `deploy-vercel.yml` uses the chosen project's production environment for its
  stable URL, pulls configuration, builds and deploys prebuilt output. Production
  explicitly checks that demo mode is false and the demo password is absent.
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

1. Resolve Vercel access for the intended team. Reading `stagecom` by name without
   an explicit team works and identifies the older Nuxt project. Requests with
   explicit team `team_5DinBWVxQJQbFt4CBlz5R5cZ` return 403 for
   `austin-scotts-projects`; listing teams returns none. Do not disconnect the
   plugin merely because one scoping path fails. Team-scoped project creation
   may require adjusted authorization or a dashboard step.
2. Inspect the existing project and create/reuse the two intended projects.
   Do not import/deploy the current main branch as an initial project deployment.
   Use link-only setup, or import the prepared release after its configuration
   is published and automatic Git deployment is disabled.
   Configure TanStack Start, Node 24, `npm ci`, `npm run build` and
   `NITRO_PRESET=vercel`. Configure protection before enabling review personas.
3. Set each Vercel project's own public build/runtime variables:
   `VITE_APP_TITLE`, `VITE_APP_URL`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`. Set `SUPABASE_SERVICE_ROLE_KEY` only as a server
   secret. For production set `STAGECOM_DEMO_MODE=false` and omit the demo
   password. Hosted servers use `NODE_ENV=production` for Secure Auth cookies.
4. Create GitHub environments named `dev` and `production`. Each holds its own
   `VERCEL_TOKEN` secret and `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`,
   `VERCEL_CLI_VERSION` variables. Select an exact published, validated CLI
   version; the workflow refuses an empty value, `latest`, or a version range.
   Store tokens through account/secret tooling, never in chat or git.
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
the production project to the chosen previous production deployment; do not
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

## Local preparation evidence (2026-10-05)

- Typecheck passed; the Nitro Vercel build passed and generated Build Output API
  version 3 under `.vercel/output` (ignored from git).
- Application tests: 56 files and 183 tests passed; three database-dependent
  files/tests skipped because a local database stack was unavailable.
- Three delivery-policy checks passed, covering allowed names, forbidden
  sandbox promotion and exclusion of main from deployment.
- Workflow YAML parsed, local reusable workflow paths exist, all workflow shell
  steps passed `bash -n`, and formatting/whitespace checks passed.
- Scoped ESLint could not start: installed dependencies lack `@shadcn/lint`,
  which the existing ESLint configuration imports.
- Database and browser suites were not executed here: Docker socket access is
  unavailable. Their remote CI execution remains required before deployment.
- No live GitHub Actions run, hosted smoke check, branch protection change,
  Vercel project mutation, deployment, migration, seed or release occurred.
