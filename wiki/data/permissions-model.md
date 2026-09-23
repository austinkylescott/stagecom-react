# Permissions Model

Documentation status: active

Implementation status: implemented for the described operational access paths

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
- Event Staff Assignment: an invited Event responsibility that counts toward coverage after the Member accepts.
- Cast Member: explicit, accepted Event participation only.
- Reviewer: Owner/Admin by default or a Member with an explicit review capability.

Managed Event leadership is persisted in `show_leadership`. One Event may have
multiple Producers and at most one Director; the same active Member may hold
both roles.

Any current active Event leader may create a private Cast invitation; Theater
Owner/Admin operational visibility alone does not grant invitation authority.
Pending invitees, accepted Cast Members, Reviewers, and operational actors
receive distinct private Event read models.

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

Theater Operators can inspect operational Calendar detail and manage Schedule
Blocks. An involved person sees only relationship-authorized Event and
Occurrence detail; an uninvolved active Member sees time and resource as
opaque occupancy, with no private Event title, Schedule Block label, notes,
creator, or unauthorized link. Personal Calendar includes only the person's
own accepted commitments and Calls. A pending Event Staff Assignment gives its
recipient a response path but no accepted staff access; after acceptance,
access remains scoped to the Event summary, responsibility, assigned
Occurrences, Calls, and necessary logistics unless another relationship grants
more. Pending Cast disclosure is limited as described below.

People exposes active display names and Owner/Admin badges to Members.
Invitations, capabilities, Former Members, and access history require Theater
Operator authority. Ordinary Settings are Operator-owned; Ownership &
Security is Owner-only. Admin revocation removes authority for later private
reads and mutations.

## Public Read Boundary

Public Theater/Event queries must use separate anonymous-safe public query modules. Draft and archived Theater data is not public.

The public Theater Event-card query returns only published Event presentation
and its next published Performance snapshot. It includes an explicit cancelled
state until the final scheduled Performance passes. It excludes private Event
titles, Candidate Slots, internal health, staffing, and logistics. The private
Event workspace separately redacts a pending Cast invitee to their invitation,
inviter, role, Event summary, and response action until acceptance.

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
