# People and self-service Teams

Implementation status: Partially implemented; STA-71 scope implemented and its
approved migration integrated into remote dev, with verification recorded in
the review contract. The approved demo seed is persisted in the current single
remote project.
STA-72 adds consent-based authority and ownership continuity; its forward
migration is locally verified and awaits separate remote integration approval.

Active Theater Members find people by name, profile avatar, and any selected
Team filter. Names are always displayed; Members may show several Team labels.
The same People workspace preserves Operator-only Invitations, Access & Roles,
Former Members, and Admin authority history.

Any active Theater Member creates a Theater-local Team and becomes its first
Member and Team Owner. The Owner or an accepted Team Admin invites active Members; each invitation remains
pending until its recipient accepts or declines. Team details show names and
invitation status. Search, input validation and recoverable errors stay in the
workspace; refreshing Teams preserves editing input.

The Owner alone offers and removes Admin authority. The recipient accepts
personally; Admins can relinquish authority. Owner/Admins rename the Team and
remove ordinary Members. Team administration stays within Team scope.

Members leave through an accessible confirmation dialog, without affecting
independent Cast, leadership, staff or Calls. When several Members remain, an
Owner chooses a successor and may offer departure with ownership; acceptance
commits transfer and departure together. With one remaining Member, that Member
becomes Owner automatically. With none, the Team dissolves and pending offers end.

An Owner can nominate a consenting recovery replacement. Theater membership
loss ends current Team participation and authority transactionally. An eligible,
accepted nominee succeeds first; otherwise the longest-standing eligible Member
succeeds, with ascending user UUID breaking equal current Team tenure. Rejoining
requires a fresh invitation and resets tenure. Empty Teams disappear from active
discovery; persisted records and domain events retain factual history. Operators
gain no implicit Team power or Team recovery interface.

[Authority and continuity contract](../../docs/design/team-authority-contract.md)
describes the approved permissions, tenure, persistence and concurrency rules.

[Permissions, transactions and concurrency](../../docs/design/teams-contract.md)
describe the persistence contract and approved boundaries.
