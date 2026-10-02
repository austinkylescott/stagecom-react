# Team authority and continuity (STA-72)

Status: maintainer-approved implementation contract (2026-10-02).

## Existing capabilities and gaps

STA-71 supplies Theater-local Team storage, personal membership acceptance,
private authenticated projections, version checks, command receipts and factual
activity events. It denies direct client table access and adds no Theater/Event
power. Missing capabilities are renaming, consent-based Admin delegation,
removal/relinquishment, ownership offers and recovery on membership loss.
Remote dev migration versions match starting main `40856eb`; historical SQL
exceptions are recorded in `teams-contract.md` and are preserved.

## Approved permissions and lifecycle

Only the Team Owner offers/removes Admin authority, offers ownership and chooses
a recovery nominee. Accepted Admins and the Owner rename, invite Theater Members
and remove ordinary Team Members. Admins relinquish their own authority. An Admin
cannot remove another Admin or the Owner. Nobody can silently grant authority.
All recipients must be accepted Team Members and active Theater Members.

A transfer offer may retain the old Owner as a Member or include their departure.
When several Members remain after departure, the Owner chooses a successor;
recipient acceptance atomically transfers ownership and commits that departure.
Until acceptance, the Owner stays accountable. Offers may be declined or cancelled.
With one remaining eligible Member, departure transfers automatically; with none,
it dissolves the Team and closes pending invitations/offers. Event relationships
are independent and are never changed by Team commands.

The Owner offers one persisted recovery nomination, requiring personal consent.
An accepted eligible nominee takes priority on involuntary recovery. Otherwise
choose the earliest current accepted Team `joined_at`, then ascending user UUID.
Pending consent is never a recovery choice. Loss of Theater membership ends current
Team membership and all Team authority in the same transaction; rejoining requires
a fresh invitation and resets tenure. Historical records and activity events remain.
An empty Team dissolves and disappears from discovery. No Operator recovery UI or
implicit Team authority is added.

## Transactions and concurrency

Commands derive the actor from Auth, recheck active Theater membership, lock
Theater memberships in user UUID order before the Team, require the displayed
Team version, and persist exact-input command receipts. Deactivation locks the
same ordered membership set before its existing authorization and writes. Team
recovery runs in that membership transaction and locks affected Teams in ID order.
Concurrent acceptance/departure/deactivation either commits against current state
or rejects stale input; retries return the original committed result after
rechecking Theater eligibility. Losing a candidate invalidates their offers and
nomination. Recovery clears ownership offers to prevent former-owner decisions
from being accepted against new authority. Every changed Team increments version.
Privileged direct fixture writes are outside the application command ordering;
transaction rollback preserves the prior state on any failure.

## Verification seams

Reuse the maintainer-agreed authenticated browser journey, authorized feature
commands/queries and real database RPC/RLS seams from STA-65/71. Test one behavior
at a time before implementing it. Seed only isolated local review data. Remote
migration/seeding retains per-operation approval.

## Integration boundary

This change is prepared as a forward migration. Remote application and demo seed
execution have not been authorized for STA-72. Use the isolated local stack and
the extended database-backed demo for review until that operation is approved.
Team RPC projections and application validation change together; deploy them
with the migration. Generated types reflect the verified pending local schema.

## Verification and review

The forward migration was applied from an empty isolated local Supabase stack
on 553xx ports. All 569 database checks passed; generated local types exactly
matched the committed file. The unit suite passed 176 tests with two existing
skips. Typechecking, touched-file ESLint/Prettier and production build passed.
Security advisors reported only the existing `pg_trgm` and `btree_gist` extension
placement warnings, with no Team findings. The extended demo reseeded twice.

The full browser run had 28 passes, one existing skip and 11 failures, including
all five Team browser/RPC scenarios passing. The Team journey covered delegated
Admin consent, removal/relinquishment, declined/accepted ownership, atomic
departure, sole-member succession, dissolution, reload, rejected stale actions,
permission loss and the deactivation/acceptance race. Browser viewports covered
360/390px and desktop, dialog focus/Escape and horizontal overflow. Viewport
emulation does not verify an actual device's software keyboard. The broad suite
is not represented as green. All eleven failing cases also failed against the
unchanged starting-main application (`40856eb`) using the same isolated local
schema and the original main demo seed; no baseline application code was changed.

## Standards

No actionable Standards findings. The staged changes follow documented feature
boundaries, Zod/AppError contracts, forward-migration discipline and synchronized
domain/wiki documentation. Membership-first locks, versions and command receipts
match the approved contract. The stock shadcn Dialog follows the shared primitive
convention, with modal error announcements and focus fallback.

## Spec

No actionable Spec findings. Consent-based delegation, scoped administration,
atomic transfer/departure, sole-Member succession, persisted recovery nomination,
deterministic tenure fallback and transactional membership-loss recovery match
STA-72 and the maintainer-approved contract. No Operator recovery UI was added.

Review totals: Standards 0; Spec 0.

The final focused run passed all five Team browser/RPC scenarios again after
adding browser recovery-nomination consent/reload checks and stock-dialog focus
assertions. It exposed and fixed phone overflow from long authority-action
labels; those buttons now wrap, including during 390px confirmation dialogs.
