# Permissions Model

Documentation status: active

Implementation status: partially implemented

Stagecom permissions are contextual. Authority belongs to a Theater or Event relationship rather than to a global user type.

## Theater Roles

- `owner`: final Theater authority and future billing/destructive-settings owner.
- `admin`: manages the Theater workspace, Members, Events, review/publication, and Event staff defaults.
- `member`: belongs to a Theater and may be cast, direct, or receive explicit capabilities within Theater policy.

Legacy enum values from the old schema are not assigned by new UI.

## Proposal Policy

Each Theater allows the full Producer workflow for all Members, designated Proposers, or Admins only. Owner/Admin always qualify. Every co-Producer must satisfy the policy.

The executable schema stores this choice on the Theater and stores Proposer and
Reviewer capabilities separately from membership roles. Capability assignment
requires current active membership and an Owner/Admin command.

## Event Roles

- Producer: manages proposal details, logistics, public presentation, and submission.
- Director: manages cast invitations and Occurrence participation.
- staff assignment: one-off Event role assigned by Owner/Admin.
- Cast Member: explicit, accepted Event participation only.
- Reviewer: Owner/Admin by default or a Member with an explicit review capability.

Managed Event leadership is persisted in `show_leadership`. One Event may have
multiple Producers and at most one Director; the same active Member may hold
both roles.

## Invariants

- Producers are never assumed to be cast.
- Cast membership requires an explicit `show_cast` row in the current schema.
- All Event collaborators must be active Theater Members in the current milestone.
- Producers do not manage Event staff assignments by default.
- Owner/Admin publishes public Theater and Event surfaces.
- Operational Approval does not automatically publish an Event.
- Owner self-approval uses an explicit audited override; other authors cannot review their own Proposal Revisions.

## Authorization Boundary

All mutations and private reads go through app-owned server functions/commands. Service-role Supabase clients are allowed only in server code after explicit app-level authorization.

## Public Read Boundary

Public Theater/Event queries must use separate anonymous-safe public query modules. Draft and archived Theater data is not public.

The persistent Theater slice enforces this boundary in the database as well as
the app query layer. `anon` and `authenticated` may select only the approved
public Theater columns, while Theater RLS returns published rows to anonymous
requests and additionally returns a Member's own Theaters to authenticated
requests. Theater membership columns are selectable by `authenticated` only;
membership RLS limits those rows to the current Member or an authorized Theater
relationship. Privileged Theater transaction functions remain executable only
by `service_role` after app-level authorization.

## Reusable Join Links

Possession of an active Reusable Join Link grants immediate base `member` access. Links never grant elevated roles or capabilities. Owner/Admin may revoke or rotate them and may configure expiration or use limits.
