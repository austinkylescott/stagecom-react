# STA-73 verification

The implemented Cast & Team section uses the existing authenticated application,
Team workspace, Cast invitation transaction and personal response semantics.
The capability, permission and concurrency mapping is in
[the contract](team-cast-invitation-contract.md).

## Evidence

- Clean full forward migration chain applied to disposable local Supabase,
  including `20261002192510_reviewed_team_cast_invitations`.
- All 28 database files / 591 assertions passed. The batch tests cover overlapping
  whole Teams/subsets, named reviews, changed membership, duplicate exclusion,
  authorization, last-recipient failure rollback and idempotent retry.
- Generated public-schema types exactly match the local database.
- Typecheck, scoped lint, production build, and all 180 active unit tests passed
  (two pre-existing skips).
- All seven focused Cast invitation and Callsheet browser tests passed. Phone and
  keyboard selection, refreshed review, offline retry, real database batch
  failure/retry, pending participation, personal acceptance, Callsheet action
  clearing, reload persistence, denied access and concurrent sends were verified.
- Full browser suite: 26 passed, one skipped, 14 failed. The same suite at the
  agreed baseline `e4445c9` reproduced 13 failures (obsolete selectors, auth test
  assumptions and recovery assertions). The remaining Callsheet failure passed
  in the isolated final rerun. No full-suite green claim is made.
- Independent Standards and Spec reviews reported no findings. Local security
  advisors reported only existing `pg_trgm` and `btree_gist` extension placement
  warnings; no new review table/RPC warnings.

Fault injection in the local browser test uses `psql` with the local database URL.
Alternatively set `STAGECOM_TEST_DB_CONTAINER` to the local Supabase database
container name. It adds a temporary constraint scoped to the fixture Event and
recipient, then removes it before retry (and in cleanup). It refuses remote
hosts. No fault injection is available in application code.

## Integration boundary

Remote migration history matches fetched `origin/main` through STA-72. STA-73's
migration and extended demo seed have not been applied remotely. Explicit
operation approval is required before either action; branding, merge and release
remain separate gates. The local demo offers **Team Cast Invitation Review**
under Compass Rose, with accepted Parker, pending Casey and eligible Morgan.
