# Release readiness

Read-only account audit and local bootstrap preparation, 2026-10-05.

## Confirmed state

| Item                                 | Evidence                                                                                                                                             | Remaining work                                                                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database separation                  | Supabase lists one active Stagecom project, integration `obufimjayisdhkjjxhfd`. Vercel Production still references it.                               | Provision a separate production project; apply the reviewed migration chain without demo seeding; configure Production credentials and Auth URLs.  |
| Production credentials and approvals | GitHub `Production` has no secrets, variables, reviewers or deployment branch rules. Vercel Production has demo mode false, but no service-role key. | Configure the existing GitHub environment and Vercel Production server secret after selecting the production database.                             |
| Manual release dispatch              | Main is `00d4f1f` and has no workflows. Dev is `1de0232` and includes PR #73.                                                                        | Publish and review the prepared bootstrap, then approve its incorporation into main.                                                               |
| Required checks                      | Main and dev are unprotected; repository rulesets are empty. Latest CI reports `policy` and `checks / verify`.                                       | Require these exact checks on main, dev and release branches; protect release-to-main review.                                                      |
| Independent Git deployments          | Main has no `vercel.json`; dev disables Git deployments.                                                                                             | Include that configuration in the bootstrap; verify the effective hosting policy after incorporation.                                              |
| Full verification                    | Latest green dev CI is the fast profile. Earlier full local browser evidence is 45 passes, one intermittent failure and one skip.                    | Run the full CI profile on the bootstrap PR and assembled release candidate. Investigate any failure; do not substitute smoke coverage or retries. |

Hosted dev is already enabled: `HOSTED_DEV_ENABLED=true`, with a successful
`deploy-dev / deploy` job in [run 37357631310](https://github.com/austinkylescott/stagecom-react/actions/runs/37357631310).
Vercel reports project-wide SSO protection. The audit did not perform a live
anonymous-access or authenticated browser smoke check.

## Prepared bootstrap scope

The local patch carries PR #73's four workflows, delivery scripts and their
checks, Vercel configuration, related delivery guidance, and the four previously
reviewed browser synchronization changes onto the main checkout. It excludes
unrelated agent-skill changes from dev. The security patch is already on main.
No new fix for the intermittent Event-publication failure is claimed.

Use a main-based release branch such as `release/0.0.0-bootstrap` for the
bootstrap PR: current policy only permits release branches to enter main.
This is a delivery bootstrap, not authorization to deploy that branch. The PR
runs the full verification profile even before manual dispatch is available.
After a green run and approved incorporation, manual dispatch becomes available
on the default branch. Incorporating the patch must not deploy main.

## Account changes to approve

1. Provision a new production Supabase project in the existing organization,
   using `us-east-2` to match integration unless a different region is chosen.
   Review the migration inventory, then separately approve applying it. Do not
   copy integration users, sessions or demo data. Confirm required Auth callback
   URLs, email delivery and backup settings before deployment.
2. Set Production Vercel variables to that project's URL, anon key and server-only
   service-role key. Keep `STAGECOM_DEMO_MODE=false` and the demo password absent.
   Configure Auth with the actual production domain. Store credentials using
   secret tooling; never put values in this document, chat or git.
3. Reuse GitHub `Production`. Set `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` to the
   same project as dev, and `VERCEL_CLI_VERSION=62.2.0`. Install a CI-authorized
   `VERCEL_TOKEN` through secure input: GitHub does not allow retrieving the dev
   secret's value. Require reviewer `austinkylescott`; allow self-review if this
   maintainer dispatches and approves releases. Disable administrator bypass.
   Restrict the workflow ref to main; the workflow independently validates and
   pins its release-branch input. These are different refs.
4. Require `policy` and `checks / verify`, with an up-to-date base, on main, dev
   and `release/*`. Block force pushes and deletion. Require a PR and review for
   main incorporation; confirm who can supply that review before enforcing an
   approval count that would block the sole maintainer. Keep dev resets as a
   separately approved operation rather than a general bypass.
5. Approve publishing the bootstrap PR, inspect its full verification result,
   then separately approve its merge. Only after database, credentials and
   approvals are verified should an actual production release be authorized.

GitHub supports required environment reviewers for this public repository, and
environment names are case insensitive. See [GitHub's environment guidance](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments).

## Local verification

- Delivery script checks: seven passed; fake CLI only, no deployment.
- Typecheck, formatting, whitespace checks and Vercel build: passed.
- Application tests: 183 passed, three database-dependent tests skipped.
- Full database acceptance and browser regression: not run in this checkout.
  Existing Docker stacks were inspected but not reset, seeded or stopped.

This is not a green full release run. The [browser investigation](hosted-browser-regression.md)
retains the existing failure evidence. Nothing was committed, published, merged,
migrated remotely or deployed during this preparation.
