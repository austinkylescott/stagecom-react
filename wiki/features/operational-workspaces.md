# Operational Workspaces

Documentation status: active

Implementation status: production surfaces implemented; milestone verification in progress

The STA-25 workspace now has a personal Callsheet and Calendar, a Theater
Operations cockpit and authorized Theater Calendar, People and Settings
sections, and the six-section Event workspace. Callsheet separates personal
commitments from shared Theater decisions. The shared list projects only
current Work Queue actions that the viewer can resolve across active Theater
memberships; Notification read or dismissal does not change it. Operational
Exceptions remain watch-only.

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
discovery from the public Theater page. It checks pending Cast disclosure,
Notification dismissal without losing the staff commitment, phone-width Cast
response, Member Calendar redaction, Admin acceptance and removal, and accepted
ownership transfer. Focused read-model tests cover shared-work ordering and
pending invitation presentation. Local database tests check the anonymous
public-discovery allowlist, cancellation and end-of-listing boundary, and
invitee-only staff response authorization.

These checks demonstrate working paths, but the STA-56 acceptance seam remains
partial: it does not yet exercise every persona and alternate outcome from
visible starting surfaces in one journey. The validation record documents one
internal prototype walkthrough and no uncoached Theater Operator sessions;
there is no measured 30-second discovery claim yet.

Multiple modeled resources, recurrence, external calendar synchronization,
manual tasks, and a public past-Events archive remain outside the milestone.
The established public playbill and calm authenticated visual direction remain.

See the [accepted spec](../../docs/specs/operational-workspaces.md),
[actor/state matrix](../../docs/design/operational-actor-state-matrix.md),
[validation record](../design/operational-workspaces-validation.md), and
[work versus alerts decision](../../docs/adr/0002-separate-work-from-alerts.md).
