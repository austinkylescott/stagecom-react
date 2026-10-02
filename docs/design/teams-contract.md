# People and self-service Teams (STA-71)

Status: STA-71 implementation contract; maintainer approved first-version boundaries.
STA-72 supersedes the initial governance limits through the
[approved authority contract](team-authority-contract.md).

## Existing capabilities

`getPeopleWorkspace` authorizes active Theater membership before reading the
Directory. It separately exposes Access & Roles, invitations, join links and
Former Member history to Operators. Profiles already store `avatar_url`.
Theater membership deactivation has versioned, audited transactions. Event
Cast, leadership, staff and Calls are independent persisted relationships.
No Team storage, permissions or commands existed on the starting main commit
`d205fda`. Remote dev initially listed the same migration versions as that main
commit. The maintainer subsequently approved remote migration and seeding.

## Approved scope

Teams belong to one Theater. Any active Theater Member creates a Team and
becomes its Owner. Only that Owner invites active Members; recipients alone
accept or decline. Active Theater Members see Team names and accepted eligible
memberships; pending invitations are visible to their recipient and Team Owner.
Teams confer no Theater or Event authority. Ordinary Members leave themselves.
A sole Owner may leave and dissolve the Team. An Owner with other accepted
Members must use the consent-based succession workflow supplied by STA-72;
STA-71 refuses that departure. Renaming, delegation and recovery are STA-72.

Loss of Theater membership immediately removes eligibility for Team reads and
writes and removes the person from active Directory/Team projections. Persisted
Team records remain historical facts. If the Owner is no longer eligible,
inviting/acceptance are frozen pending STA-72 recovery; ordinary eligible
Members can still leave. No Operator Team recovery UI or implicit power is added.
The existing Operator deactivation command retains its behavior.

## Transactions and concurrency

Authenticated RPCs derive the actor from `auth.uid()`, validate active Theater
membership again inside the transaction, and lock Theater membership rows
in user-ID order before locking a Team. Deactivation therefore either completes
before a command's eligibility check or waits for the Team write to commit.
Every Team change increments its version; mutations carry the displayed version
and reject stale input. Invitation acceptance and departure cannot race each
other into silent enrollment. Each command ID stores actor, exact input and
result; serialized retries return the same result after rechecking eligibility,
while reuse with other input is rejected. An accepted/left invitation cycle
cannot be replayed through an old UI version. Dissolved Teams leave discovery;
rows and activity events preserve history. Database grants and RLS prevent
anonymous reads and client table writes. Service-role access remains server-only.

## Agreed verification seams

Authorized commands/queries, real database transactions and RLS, and the People
workspace browser flow. Review data extends the existing disposable Supabase
Auth demo. The complete migration chain and seed reruns were verified locally
before the approved remote migration.

## Verification and review

The final implementation passed typechecking, touched-file ESLint/Prettier, and
production build. The unit suite passed 176 tests with two existing skips. A
fresh isolated Supabase stack on 553xx ports applied the complete forward chain;
all 536 database checks passed, and generated local types matched the committed
file. The extended demo reseeded twice successfully with scoped cleanup.

All three STA-71 browser/RPC scenarios passed, including phone widths 360/390,
keyboard search/filter/create/acceptance, offline retry, stale invitation recovery,
actual Theater switching, reload persistence, private pending invitations,
unauthorized reads/writes, and concurrent acceptance versus dissolution.

The broad browser run had 27 passes, one existing skip, and ten failures in older
scenarios. All ten failing test cases also failed on unchanged starting main
`d205fda`; see the pull request for the baseline comparison. They are not represented as a green
full browser suite.
Local security advisors reported only the existing `pg_trgm` and `btree_gist`
extension placement warnings, with no Team findings.

## Remote integration

After explicit maintainer approval, the reviewed SQL was applied to shared dev
`stagecom` (`obufimjayisdhkjjxhfd`) on 2026-10-02. Supabase assigned version
`20261002155338`; the pending repository migration was renamed to match, with
unchanged SQL. Stored remote migration SQL matches the reviewed file exactly.
All three Team tables have RLS enabled and deny direct anonymous/authenticated
reads. Both RPCs deny anonymous execution, use an empty search path and reject
calls without an authenticated actor. Database types were regenerated from
remote; public schema types match the locally tested schema. Typecheck and the
Theater-switch unit regression passed again.

History comparison found two pre-existing SQL differences against `d205fda`:
`initial_schema` includes later Theater identity/home and search-path changes
locally, and `targeted_theater_invitations` includes its later conflict-target
fix locally. Later forward migrations supply these changes remotely. Their
historical records were preserved.

Remote security advisors flag the Team tables' intentional lack of direct RLS
policies and the authenticated security-definer RPCs. These are the reviewed
private command/query boundary; anonymous grants remain revoked. See the
[RLS advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
and [authenticated RPC advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The maintainer confirmed that `stagecom` is currently the personal project's
only active database, without separate development/production environments,
and explicitly approved using it for the demo seed. The existing scoped seed
completed successfully remotely on 2026-10-02. Persisted Teams are Ants 2 Gods
(three accepted Members) and The Management (two), both owned by Parker Producer.
Authenticated Morgan and Casey reads verified their one/two accepted Teams;
anonymous Team reads remained denied. The existing configured demo password was
used without printing credentials. No dedicated target remains outstanding.

## Standards

No documented-standard violations or actionable baseline code smells. The
review was repeated after the Theater-switch correction.

## Spec

The initial review identified retained Team state across Theater switches. It
was fixed by remounting the Team workspace by Theater, with a regression that
failed before the fix and passed afterward plus an actual switcher browser test.
No remaining actionable Spec findings.

Review totals: Standards 0; Spec 0 remaining (one Spec finding resolved).
