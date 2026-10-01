# Availability poll implementation review (STA-69)

Reviewed against `0dbda03dd90977b2a17a6ba785db8bf8a6079531`, the current main
when implementation started. The scope is the approved STA-69 ticket and the
[maintainer-confirmed backend contract](availability-poll-contract.md).

## Standards

The independent Standards reviewer found one input-validation defect: SQL NULL
comparison allowed an authenticated respondent to submit JSON null answers.
The migration now explicitly rejects NULL. A direct-RPC regression failed
before the fix and passes after it. The delta review reports no outstanding
Standards findings.

## Spec

The independent Spec reviewer found the same invalid-answer defect and partial
keyboard verification. The browser journey now exercises leader Space/Enter,
participant Tab navigation and Enter submission, alongside phone layouts and
an interrupted network retry. The delta review reports no outstanding Spec
findings. There is no identified scope creep.

Final review totals: Standards 0 outstanding; Spec 0 outstanding.

## Verification

- `npm run typecheck`: passed.
- `npm run test`: 54 files, 176 tests passed.
- `npm run build`: passed.
- Focused ESLint, Prettier and Git whitespace checks: passed.
- `npm run db:types:check:local`: passed; generated types contain only the poll
  schema additions after formatting.
- Poll pgTAP suite: 26 assertions passed, including explicit selected-Cast
  authorization, staff independence, private drafts, complete submissions,
  null-answer rejection, stale writes, retry after closure, replacement/history
  and lost eligibility.
- Three real-authenticated browser/API journeys passed. They cover named peer
  comparison, missing responses and totals, draft reload, resubmission, Callsheet
  action clearing with confirmed Calls preserved, stale-tab recovery, offline
  retry, closed-poll edits, keyboard operation and 360/390/1280px layout checks.
- Authenticated RPC calls from pending invitees, an Admin without Event
  leadership and an unrelated newcomer cannot read/write poll answers. Anonymous
  access is denied. Concurrent submit/close verifies a committed submission or
  closure rejection, followed by an idempotent retry of the same command.
- The complete database suite initially failed on the populated local demo
  database because older fixtures count global rows and assume empty tables.
  Verification then used a separate empty local database with the actual app,
  Auth and private schema definitions, constraints, triggers, RLS and ACLs.
  Its required `btree_gist`, `pg_trgm` and pgTAP extensions were installed.
  Supabase-managed infrastructure and other roles' future default ACLs were
  excluded; current application ACLs and postgres defaults were preserved.
  All 22 application suites passed (422 assertions). The remaining Event
  completion suite depends on the original database's pg_cron scheduler and
  passed there separately (23 assertions). Together these verify all 23 suites
  and 445 assertions without resetting the existing local dataset.
- The final forward migration was also applied from an absent poll schema in
  the empty verification database, and all 26 poll assertions passed afterward.

## Remaining review boundaries

The migration and seed changes have only been executed locally. Remote migration
history comparison and integration are pending; remote migrations and seeding
require explicit operation approval. The draft PR must carry that limitation.

Viewport checks do not establish physical-device software-keyboard behavior.
Maintainer page-by-page presentation review and later branding remain separate
review gates; this implementation does not claim uncoached usability evidence.
