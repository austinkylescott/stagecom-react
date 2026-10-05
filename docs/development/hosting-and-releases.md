# Site deployment

GitHub Actions deploys `dev` to the dev site with Vercel Preview variables and
`main` to the production site with Production variables. The workflow can also
be manually dispatched from either branch. Other branches do not deploy.

There are no test, branch-policy, release-verification or deployment-smoke gates.
Each deployment pulls its environment, builds the checked-out commit and uploads
that build. `vercel.json` disables independent Vercel Git deployments so Actions
owns this path.

The GitHub `dev` and `production` environments each need `VERCEL_TOKEN` as a
secret and `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_CLI_VERSION` as
variables. Production retains the guard against demo mode and demo credentials.
Existing environment approval settings still apply if configured.

This configuration does not provision a database, change credentials or deploy
until published onto the corresponding branch. Production database separation
and environment setup remain external operations.
