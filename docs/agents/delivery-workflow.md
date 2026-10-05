# Delivery Workflow

Linear is the source of truth for work. GitHub branches and pull requests are
the delivery mechanism. GitHub Issues are not used.

## Branch Names

Use lowercase kebab-case names with a change type and Linear identifier:

```text
feat/sta-76-hosted-review-environment
fix/sta-77-preserve-login-return
refactor/sta-78-simplify-calendar-query
test/sta-79-release-smoke-checks
docs/sta-80-release-workflow
chore/sta-81-configure-ci
hotfix/sta-82-login-return
```

This convention supersedes Linear-generated username prefixes. Preserve the
issue identifier for linking; derive the type from the actual work. Existing
branches need not be renamed unless entering the new pipeline. Explicitly
approved ticketless chores/documentation may use `chore/<description>` or
`docs/<description>`. Explorations use `prototype/<description>`.

## Release Lifecycle

- `main` is canonical code after production observation. It is never deployed.
- `dev` is a disposable integration sandbox deployed to the protected dev site.
- `release/<version>` (for example `release/0.1.0`) is a release package based
  on `main`. Only these branches may be deployed to production.
- Work branches remain independent of the accumulated sandbox. Integrate them
  into `dev` for live review and individually into a release after approval.
  Never merge the whole sandbox into a release. Include required dependencies.
- Prefer ordinary merge commits when integrating work into dev/releases, so
  repeated integration preserves ancestry. Keep work branches through release
  incorporation; do not copy unrelated dev changes back into them.
- Check the assembled release, select its exact commit and deploy on demand.
  There is no fixed cadence. Do not merge into main immediately on deployment.
- Observe the deployed release. For a defect, redeploy a known-good previous
  deployment, or branch a `hotfix/sta-<id>-<description>` from the affected
  release, merge the reviewed fix into it and redeploy. Record deployment URLs,
  SHAs and immutable version tags; never move an existing deployment tag.
- After sufficient validation, normally before the next release, squash-merge
  the current release (including hotfixes) into main. Include every delivered
  Linear identifier in the release PR and squash body. This merge deploys
  nothing. Only then mark the associated tickets Done after verification.
- Build the next release from updated main. Reconcile any already-prepared
  candidate with the newly incorporated release and hotfixes, then rerun checks.
- Resetting dev from main is a deliberate, explicitly approved destructive
  branch operation. Preserve outstanding ticket branches and publish resets
  with an exact lease against the observed remote dev tip. Never reset a
  release branch to clean up sandbox work.

The release PR lists each ticket, type, description, source branch and PR,
included hotfixes, database changes and verification. Branch names alone are
not a reliable release inventory.

See `docs/development/hosting-and-releases.md` for CI, environments, deployment
and rollback setup. Repo policy applies when using `implement-spec` too: its
integration branch must follow the release gate and may not close tickets early.

## Working A Linear Ticket

Invoking the `implement` skill with a Linear ticket authorizes the agent to
complete the ordinary delivery loop for that ticket:

1. Read the complete ticket, including comments, labels, relationships, and
   acceptance criteria.
2. Move that ticket to `In Progress` and create or switch to its focused branch
   from an up-to-date `main`.
3. Implement the ticket, update relevant documentation, and run proportionate
   checks.
4. Check off each Linear checklist item as evidence confirms it is complete.
5. Review the ticket-scoped diff and commit it using the convention below.
6. Push the branch, open or update a draft pull request targeting `dev` for
   sandbox review (or an explicitly selected release), attach it to the Linear
   ticket, and move the ticket to `In Review`.

That invocation is the maintainer's standing approval for those ticket-scoped
actions. Do not interrupt the loop for separate approval at every commit, push,
pull-request update, or status transition.

It does **not** authorize:

- merging the pull request;
- moving the ticket to `Done` before its validated release is incorporated
  into `main` and that merge is verified;
- changing parent, related, onboarding, or otherwise out-of-scope tickets;
- remote database migrations, remote seeding, production changes, or releases;
- including unrelated working-tree changes in the commit.

Those actions require explicit approval. Work not initiated through the
`implement` skill also requires explicit approval before committing or
publishing changes.

## Linear Checklists

Treat the ticket checklist as the visible record of what was delivered. Updating
checkboxes on the implementation ticket is part of the standing `implement`
authorization.

- Check an item only after the implementation and relevant verification provide
  concrete evidence that it is complete.
- Preserve the wording and scope of the checklist. Do not weaken, rewrite, or
  remove an item merely to mark it complete.
- Before moving the ticket to `In Review`, reconcile every checklist item
  against the final diff and test results.
- If an item is incomplete, blocked, intentionally deferred, or cannot be
  verified, leave it unchecked and add a Linear comment explaining why.
- Summarize any remaining unchecked items in the pull request. Do not present
  the ticket as fully complete while required items remain unchecked.

## Branches And Pull Requests

- Start focused branches from `main` using the branch convention above. When
  unreleased dependencies are necessary, name and include them explicitly;
  do not use the mixed dev sandbox as a base. Hotfixes start from the affected
  release branch.
- Keep one implementation ticket per branch and pull request unless the
  maintainer approves a different grouping.
- Open pull requests as drafts while work or review remains.
- Include the Linear identifier and a concise verification summary in the pull
  request.
- Keep a ticket `In Review` through sandbox testing, release assembly and
  production observation. Move it to `Done` only after the release is
  incorporated into main and the merge is verified.

## Commit Messages

Use Conventional Commit types and include the Linear identifier:

```text
type: concise imperative summary (STA-123)
```

Allowed types are `feat`, `fix`, `test`, `docs`, `refactor`, and `chore`.
Examples:

```text
feat: add cast invitation expiry (STA-123)
fix: preserve reviewer access after reassignment (STA-207)
docs: clarify local database reset flow (STA-244)
```

Use the ticket identifier rather than a GitHub issue number. For explicitly
approved repository chores with no Linear ticket, omit the identifier.

## Verification

Run checks proportionate to the change. The standard full set is:

```bash
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

Record checks that were run, and any justified omissions, in the pull request.
