# Operational Workspaces

Documentation status: active

Implementation status: partially implemented

The STA-25 workspace now has a personal Callsheet and Calendar, a Theater
Operations cockpit and authorized Theater Calendar, People and Settings
sections, and the six-section Event workspace. Callsheet separates personal
commitments from shared Theater decisions. The shared list projects only
current Work Queue actions that the viewer can resolve across active Theater
memberships; Notification read or dismissal does not change it. Operational
Exceptions remain watch-only for the viewer. A pending Proposal Revision, for
example, can be a Work Queue decision for an eligible Reviewer and an
Operational Exception for its author.

Owner and Admin authority, pending Admin Invitations, accepted ownership
transfer, Schedule Blocks, and accepted Event Staff Assignments are explicit
relationships and commands. Calendar occupancy includes committed Occurrences,
exclusive holds, and Schedule Blocks, with private details redacted for
uninvolved Members. Published Theater pages list upcoming published Event
snapshots, including a clear cancelled state through the final scheduled
Performance. Anonymous cards carry only the public presentation fields.

## Evidence and limits

The seeded browser journey starts the Cast response, staff response, and
Owner's shared Publication decision from Callsheet, then starts anonymous
discovery from the public Theater page. Producer, Director, and Reviewer now
enter Event work through the visible Theater and Event navigation. A distinct
Admin session handles staffing. A multi-role Reviewer with a pending Cast
invitation sees separate personal and shared actions for the same Event. The
journey checks pending Cast disclosure and a coarse plan summary for deciding
on the invitation. It also covers Notification dismissal without losing the
staff commitment, phone-width Cast
response, Member Calendar redaction, Admin acceptance and removal, and accepted
ownership transfer. Focused read-model tests cover shared-work ordering and
pending invitation presentation. Local database tests check the anonymous
public-discovery allowlist, cancellation and end-of-listing boundary, and
invitee-only staff response authorization.

The Event Portfolio reads current Theater work and personal Event commitments
through Theater-scoped readers. It does not load the person's cross-Theater
Callsheet. The Callsheet and Event Portfolio share the same personal commitment
rules; the Portfolio's authorized read owns relationship-based Event visibility
and associates actions with Events in the requested Theater. Saved views,
filters, and sorting operate on that authorized result in the browser.
The personal Event commitments read checks active membership for the requested
Theater scope before reading Event details. Callsheet requests all active
Theaters; Event Portfolio requests one Theater. Event details are read only for
Events connected to that person.

The merged [STA-25 verification PR](https://github.com/austinkylescott/stagecom-react/pull/49)
records a passing seeded browser journey, focused scenarios, 168 unit and
integration tests, local database checks, type checking, and a production
build. The [seeded journey](../../e2e/event-publication-milestone.spec.ts)
and [focused browser scenarios](../../e2e/) are the reviewable test sources;
the PR holds their run results. The browser journey proves that the covered people can find those
actions through visible navigation in the tested states. STA-56 is marked Done
in Linear, but no separate complete-journey artifact is linked there. PR #49
explicitly records missing full-persona and alternate-outcome coverage, so its
results do not prove every STA-56 scenario. The validation record contains one
internal prototype walkthrough and no uncoached Theater Operator sessions; no
measured 30-second discovery or human usability graduation is claimed.

Multiple modeled resources, recurrence, external calendar synchronization,
manual tasks, and a public past-Events archive remain outside the milestone.
The established public playbill and calm authenticated visual direction remain.

See the [accepted spec](../../docs/specs/operational-workspaces.md),
[actor/state matrix](../../docs/design/operational-actor-state-matrix.md),
[validation record](../design/operational-workspaces-validation.md), and
[work versus alerts decision](../../docs/adr/0002-separate-work-from-alerts.md).
