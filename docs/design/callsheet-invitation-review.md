# Callsheet invitation responsibility (STA-77)

Status: implemented; automated evidence is separate from maintainer and uncoached acceptance.

## Behavior

Callsheet retains its personal-first composition. Admin, ownership and Staff
invitations explain acceptance and decline before either action. An in-place
**Review invitation details** disclosure shows the recorded inviter/proposer and
recorded offer time, with an explicit timezone. Opening, closing or reloading
this disclosure does not accept the offer.

Admin acceptance grants Theater management authority; decline grants none and
keeps membership. Ownership acceptance makes the successor Owner and displays
the transfer's recorded former-Owner role (Admin or Theater Member). Decline
leaves ownership unchanged. Staff acceptance confirms the named responsibility
and counts toward staffing coverage; Calls are independently assigned.

Missing or deleted inviter profiles, missing offer times and missing historical
Staff responsibilities are presented as unavailable. Staff `invited_at` is the
offer time; its row creation time and an Occurrence start are never substituted.
These invitations have no invented response deadline.

## Authorized reads and responses

`getMyTheaterInvitations` validates the token and establishes active Theater
memberships before service-role enrichment. Both offer reads restrict the
recipient, pending state and active Theater IDs. Only the inviter's display name
is returned; deleted profiles are treated as unavailable. The Staff enrichment
uses the existing authenticated Event commitments query, limits offers to the
actor's active Theaters and returns only responsibility, inviter name and offer
time. It returns no private notes, accepted-Cast roster, Candidate Slots or
private schedule fields to a pending invitee.

The existing response commands and database transactions recheck current
recipient authority/state. Accept and Decline remain separate explicit actions.
A submission guard and disabled buttons prevent duplicate submissions. Failed
responses keep their error and enabled actions. Success reports the returned
status, clears only that task and preserves confirmed Calls. A subsequent read
failure preserves the successful response and asks the Member to refresh.

No schema migration is needed.

## Evidence

The approved seams are recorded in [STA-76](https://linear.app/stagecom/issue/STA-76/clarify-callsheet-commitments-and-acceptance).

- Component tests cover each responsibility, both former-Owner roles, missing
  history, pending/duplicate protection, recoverable failures, response feedback
  and success followed by refresh failure.
- Local authenticated query tests exercise recipient-only Admin/ownership/Staff
  context and loss of access after membership ends. Staff fixtures include
  private notes, accepted Cast and a private Candidate Slot; exact projection
  assertions verify those fields are absent. Historical null Staff fields are
  checked separately.
- Local browser journeys review each offer by keyboard, reload before responding,
  accept on desktop and decline on phone, reload after responding, and retain an
  unrelated confirmed Call. Ownership/Admin consequences are observed through
  authenticated membership reads; accepted Staff can open their Event workspace.
- Additional local browser journeys change each offer while it is displayed and
  verify rejection remains actionable, with confirmed Calls preserved.
- Disposable fixtures create unique local actors/Theaters and remove only their
  own records. Shared remote data was not seeded or changed.

Verification (October 9, 2026):

- `npm run typecheck`: passed.
- ESLint and Prettier for changed source/test files: passed.
- `npm run build`: passed.
- Full Vitest suite with local Supabase and demo mode disabled: **198 passed,
  1 skipped**. The skipped anonymous-discovery test requires dedicated demo data.
  An earlier demo-enabled attempt failed on missing published demo Events; the
  shared local database was not reseeded to manufacture a passing fixture.
- New invitation browser suite: **9 passed**, including all three kinds at
  desktop/phone widths and stale-state rejection.
- Existing disposable Callsheet browser journey: **1 passed** after updating its
  stale “Relevant Events” assertion to main's current “Your Event workspaces”
  label; **3 demo-only persona journeys skipped** in that focused run.
- Broad browser suite on the current local schema: **31 passed, 6 failed,
  19 skipped**. One failure was the stale Callsheet region assertion, corrected
  and verified separately above. The five remaining failures are the four
  cancellation journeys and the publication milestone journey, all still
  navigating through the removed “Enter Theater” link. That link is absent from
  the main baseline too. This is an inherited test navigation gap, not a passing
  full-suite claim. Demo-dependent journeys were skipped explicitly.
- The existing four pending main migrations were applied **locally only** before
  the final broad browser run. No new migration was authored for STA-77.
- `npm run db:types:check:local`: comparison differs in `graphql_public`,
  `__InternalSupabase.PostgrestVersion` metadata and formatting. No application
  table/column differences were reported. Committed remote-generated types were
  preserved under the remote-first database workflow.
- Independent code review against `fee7396` (main): **Standards 0 findings;
  Spec 0 findings**. The adjacent regression-test label correction was also
  independently reviewed with no findings.

Physical-device, uncoached usability, maintainer acceptance and branding review
were not performed.

## Before / after snapshots

Snapshots use real local database-backed actors at 1280px desktop and 390px
phone. Before snapshots use main's original invitation presentation. After
snapshots show the corresponding disclosure opened. Dates of dynamically
created offers vary between runs; they are not fixed historical comparisons.

| Offer     | Desktop                                                                               | Phone                                                                               |
| --------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Admin     | [Before](sta-77/before-admin-1280.png) / [After](sta-77/after-admin-1280.png)         | [Before](sta-77/before-admin-390.png) / [After](sta-77/after-admin-390.png)         |
| Ownership | [Before](sta-77/before-ownership-1280.png) / [After](sta-77/after-ownership-1280.png) | [Before](sta-77/before-ownership-390.png) / [After](sta-77/after-ownership-390.png) |
| Staff     | [Before](sta-77/before-staff-1280.png) / [After](sta-77/after-staff-1280.png)         | [Before](sta-77/before-staff-390.png) / [After](sta-77/after-staff-390.png)         |
