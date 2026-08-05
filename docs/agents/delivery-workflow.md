# Delivery Workflow

Linear is the source of truth for work. GitHub branches and pull requests are
the delivery mechanism. GitHub Issues are not used.

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
6. Push the branch, open or update a draft pull request, attach it to the Linear
   ticket, and move the ticket to `In Review`.

That invocation is the maintainer's standing approval for those ticket-scoped
actions. Do not interrupt the loop for separate approval at every commit, push,
pull-request update, or status transition.

It does **not** authorize:

- merging the pull request;
- moving the ticket to `Done` before the merge is verified;
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

- Start focused branches from `main` and use the Linear-provided branch name
  when available.
- Keep one implementation ticket per branch and pull request unless the
  maintainer approves a different grouping.
- Open pull requests as drafts while work or review remains.
- Include the Linear identifier and a concise verification summary in the pull
  request.
- Move a ticket to `Done` only after its pull request is merged and the merge is
  verified.

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
