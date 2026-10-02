# People and self-service Teams (STA-71)

Status: implementation contract; maintainer approved first-version boundaries.

## Existing capabilities

`getPeopleWorkspace` authorizes active Theater membership before reading the
Directory. It separately exposes Access & Roles, invitations, join links and
Former Member history to Operators. Profiles already store `avatar_url`.
Theater membership deactivation has versioned, audited transactions. Event
Cast, leadership, staff and Calls are independent persisted relationships.
No Team storage, permissions or commands existed on the starting main commit
`d205fda`. Remote dev lists the same migration versions as that main commit;
no remote schema mutation is authorized for this work.

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
Auth demo. All migrations and seeding run locally; remote integration remains
subject to explicit operation approval.
