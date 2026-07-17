# Membership And Governance

Documentation status: active

Implementation status: partially implemented

## Who Can Belong To A Theater?

A person may hold active membership in multiple Theaters and choose a default Theater for navigation. All Producers, Directors, Reviewers, and Cast Members must be active members of the relevant Theater in the first meaningful milestone.

Persistent Theater creation currently grants the creator one active Owner
membership atomically, and Members can choose one default Theater across
multiple active memberships. Targeted Invitations now let Owner/Admin create a
single-recipient link whose token is stored only as a cryptographic hash. A
matching authenticated recipient can accept once to create or reactivate base
Member access; retries are idempotent. Reusable Join Links now grant immediate
base Member access through governed hash-only links with optional expiration
and use limits. Event capabilities and membership deactivation remain to be
implemented.

## How Does Someone Join?

- An Owner creates a Theater and receives its first membership.
- A Targeted Invitation authorizes one intended recipient.
- A Reusable Join Link grants immediate base `member` access to anyone who possesses it.

Targeted Invitations validate the signed-in email, token hash, expiry,
revocation, and prior use in one transaction. Creation, revocation, and
acceptance are recorded as Theater-local activity events. The raw token is
returned only when the invitation is created and is never listed again.

Owner/Admin may create, revoke, and rotate Reusable Join Links. A link may have an expiration or use limit, or may intentionally be non-expiring. Link-created memberships are recorded in Theater activity history. Links grant only base membership, never Owner, Admin, Reviewer, or designated-Proposer authority.

Reusable-link acceptance is atomic under concurrent requests. Active Members
may retry a still-valid link without consuming another use; revocation and
expiry still make an old token unusable. Rotation revokes the prior token and
retains lineage to the replacement.

Until Stagecom has an application email provider, invitations are generated as links for the inviter to share through an external email, text, or messaging service.

## Who Can Propose An Event?

Each Theater chooses one proposal policy:

- `all members`
- `designated proposers`
- `admins only`

Owner/Admin are always eligible. The policy governs the complete Producer workflow: creating a managed draft, inviting cast, and submitting a Proposal Revision. Every co-Producer must independently satisfy the policy. Any active Theater Member may be a Director.

## Who Can Review?

Owner/Admin are Reviewers by default. Individual Members may receive an explicit Reviewer capability without receiving unrelated administrative access. One authorized Reviewer's decision is sufficient in the current milestone.

An Owner may use an auditable self-approval override so a one-person Theater is not deadlocked. Admins and designated Reviewers may not decide Proposal Revisions they authored. A Theater may disable Owner self-approval when it requires strict separation.

## What Happens When Membership Ends?

Removing a Member ends their active Producer, Director, Reviewer, and cast assignments while preserving historical credits and activity. Affected Events become `at risk` when they lose required leadership or fall below Minimum Viable Cast, and management must intervene.

## Is There A Cross-Theater Reputation Score?

No. Each Theater may inspect its own factual Event history, including risk, cancellation, and rescheduling patterns associated with Producers. Stagecom does not calculate an automatic reliability rating or share one Theater's judgment with another.
