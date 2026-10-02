# People and self-service Teams

Implementation status: Partially implemented; STA-71 scope implemented and its
approved migration integrated into remote dev, with verification recorded in
the review contract. The approved demo seed is persisted in the current single
remote project.
Ownership administration and recovery are STA-72.

Active Theater Members find people by name, profile avatar, and any selected
Team filter. Names are always displayed; Members may show several Team labels.
The same People workspace preserves Operator-only Invitations, Access & Roles,
Former Members, and Admin authority history.

Any active Theater Member creates a Theater-local Team and becomes its first
Member and Team Owner. The Owner invites active Members; each invitation remains
pending until its recipient accepts or declines. Team details show names and
invitation status. Search, input validation and recoverable errors stay in the
workspace; refreshing Teams preserves editing input.

Ordinary Members leave through confirmation, without affecting independent Cast,
leadership, staff or Calls. A sole Owner leaving dissolves the Team and ends
pending invitations while preserving history. An Owner with other accepted
Members must wait for STA-72's consent-based succession. Theater membership
loss removes Team eligibility immediately; an ineligible Owner freezes invitations
until recovery is delivered. Operators gain no implicit Team edit access.

[Permissions, transactions and concurrency](../../docs/design/teams-contract.md)
describe the persistence contract and approved boundaries.
