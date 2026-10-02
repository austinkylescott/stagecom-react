# Planning confirmation and replacement contract (STA-70)

Status: core policies confirmed by the maintainer on 2026-10-01. Implemented in the STA-70 branch; verification evidence is recorded below.

## Capability map

Baseline: `b041592c2f70aa79fafeb30bebd46f35886ab173`, fetched `origin/main`.
Hosted dev migration history and the branch both end at `20261001221258`.
Matching history is not proof of identical SQL. Read-only hosted inspection found
no planning-target or selected-time-confirmation tables. No remote write occurred.

| Capability     | Existing contract                                                                                                                                   | STA-70 extension                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Availability   | Frozen poll options/selected accepted Cast, private drafts and named submitted answers; legacy single-slot responses are separate                   | Neither response is a selected-time confirmation                                                           |
| Planning       | Producer saves Occurrences and candidate alternatives; `confirmed_candidate_slot_id` is consumed by Calendar/Callsheet                              | Persist target separately from the current commitment                                                      |
| Calls          | Active Director assigns versioned required/optional/not-called Calls to accepted active Cast or staff                                               | Staged replacement Calls must not alter current Calls                                                      |
| Submission     | Event lock, accepted Proposed Cast, complete Calls, required legacy `available` answers, Performance MVC, buffered venue checks; immutable revision | Explicit confirmations for all required participants, including staff, and frozen selected target evidence |
| Review         | Owner/Admin/designated Reviewer; author separation; configured reasoned Owner approval override; optimistic decision version                        | Recheck target/base revision and current participant eligibility at approval                               |
| Booking        | Exclusion-constrained approved commitments and Counteroffer holds                                                                                   | Operator-granted planning hold and atomic replacement                                                      |
| Approved edits | Changed approval-scope fields clear approval and release its reservation                                                                            | A move stages changes without invoking this invalidation path                                              |
| Counteroffer   | Reviewer offer, Producer acceptance, availability requests and exclusive expiring hold                                                              | Preserve its existing workflow; a planning hold is not a Counteroffer                                      |
| Operations     | Eligible Work Queue decisions separate from watch-only exceptions                                                                                   | Pending replacement review is a decision; missing confirmations are blockers                               |
| Publication    | Anonymous allowlisted, frozen public Performance snapshot                                                                                           | Approval never republishes; public dates stay at the published snapshot until explicit Publication         |

Sources: `src/features/events/{commands,persistence,proposal-persistence}.ts`,
`src/features/events/proposal-preparation/`, `src/features/availability-polls/`,
`src/features/{theater-calendar,callsheet,work-queue}/`, and migrations
`20260729160000`, `20260729190000`, `20260729220000`, `20260904150000` and
`20261001221258`.

## Confirmed product decisions

1. Producer chooses the planning target and submits the plan. Director manages
   Calls. Selecting a target creates no booking and changes no current Calls.
2. Every required accepted active Cast/staff participant confirms the exact
   target independently of availability. Target changes or changes to an affected
   required Call invalidate the affected confirmation. Leadership is not Cast.
3. One pending move per Event preserves the existing approval and commitment
   until an eligible Reviewer approves the replacement atomically.
4. Theater Operators grant holds using the Theater response-window default
   (initially 72 hours). Producer may withdraw. Expiry releases only the hold;
   review survives and approval rechecks conflicts.
5. Published Performance snapshots change only through explicit Publication.
6. Authenticated browser journeys and local database RPCs are the agreed TDD
   seams, including authorization loss, stale writes, retries and atomic swaps.

## Transaction and lifecycle design

Targets snapshot Candidate Slot instants, duration, location and timezone
provenance; a mutable Candidate Slot identifier alone cannot identify consent.
Staged Calls and confirmations carry versions. Current committed fields and
Calls remain unchanged during replacement planning. Selection and Call edits
are separate commands with durable factual events.

Submission snapshots the exact target, staged Calls, explicit confirmations,
Proposed Cast, thresholds and resource requirements. A submitted revision is
immutable. Editing after submission requires withdrawal and a new target/revision;
participant refusal or loss of eligibility blocks approval rather than rewriting
the submitted snapshot. Initial submission preserves existing plan viability and
resource rules while adding the separate required-confirmation gate. Existing
legacy workflows must not be silently converted to poll-answer semantics.

Replacement approval checks the expected decision and target versions, current
base approval, participant authority/eligibility, confirmations, staffing and
buffered resource conflicts. It releases the old reservation and replacement
hold, creates the new commitment, updates committed Occurrence/Calls and approval
pointer, and records the decision/domain event in one transaction. Any failure
rolls back all effects, including the release. Request-edits, denial, withdrawal
and expiry retain the old commitment. A replacement denial concerns that revision,
not the approved Event lifecycle. No command changes Publication implicitly.

New target writes and approval must serialize with each other and participant
membership/acceptance changes. Use a documented consistent lock order, database
uniqueness for one pending move, and the existing reservation exclusion constraint.
Recheck authorization inside the transaction. A command ledger binds actor,
operation and payload to identity; retry of an already committed operation must
return its result without duplicating facts. Changed payloads and stale versions
conflict. Permission loss denies access even on retries.

RLS and explicit grants protect all exposed new tables. Ordinary user-scoped
clients and authorized transaction RPCs carry the feature; no browser service-role
client, anonymous planning read, or user-editable metadata authority is permitted.
Notifications derive from persisted domain events. Private planning reads do not
broaden accepted Cast/staff, pending invitation, Reviewer or Operator disclosure.

## Verification plan

Local RPC tests first prove selection leaves booking/Calls untouched and missing
confirmations block submission. Then verify explicit confirmation, permission
loss, stale target/Call/revision, idempotent retry, hold conflicts/expiry, and
failed/accepted replacement transactions. Apply forward migrations locally and
regenerate/check types. Do not reset unrelated local records.

The real authenticated browser journey follows Producer selection, Director
Calls, participant confirmation, eligible exact-revision Review, approval,
reload, Calendar Calendar, Callsheet, and permission loss in an open participant view. Cover self-authorship, configured Owner override,
network recovery, 360/390px reflow and keyboard controls. Viewport emulation does
not establish physical-device software-keyboard behavior.

Run regular typechecks and focused tests; the complete suite runs at delivery.
Record existing failures honestly. Complete independent Standards/Spec review,
commit, push and draft PR under the ticket-scoped delivery authorization. Remote
migrations/seeding, deployment, merge, release and branding keep separate gates.

## Delivered verification

- The forward migration applies to a disposable local database restored to the
  pre-planning schema; unrelated local demo data was not reset.
- 67 transactional pgTAP assertions cover selection without booking/Calls,
  explicit confirmation, membership loss (including retries), stale Call/target/
  Review versions, immutable snapshots with subsequent refusal, denial, hold
  expiry, request-edits preserving health, and reasoned configured Owner override. Additional cases cover unchanged Primary
  Venue Occurrences, committed Director Call edits, required staff, and injected
  booking failure with full transaction rollback.
- The authenticated local browser journey passes: Producer/Director, phone-width
  participant, Reviewer, network failure/retry, keyboard Enter, reload persistence,
  original commitment during a move, hold and atomic replacement, Calendar, Callsheet, and permission loss in an open participant view.
- 176 unit/integration tests, typecheck and production build pass.
- Physical-device software-keyboard behavior is not established by viewport
  emulation and remains a review gate. No remote migration or seeding occurred.

All new planning mutations lock Theater, Event, current membership/participation,
leadership and Reviewer capabilities before checking eligibility. The reservation
exclusion constraint arbitrates conflicts. Holds overlapping the existing booking
cannot be granted; approval can replace overlapping dates in its transaction.
The staged Call saves conservatively invalidate consent even when the same Call
value is saved; a retry with the same command identity does not invalidate twice.

## Independent review

Standards found an eligibility-helper privacy breach and a nonblocking duplicate
viability-count heuristic. Helpers now live in the unexposed private schema;
authorized RLS reads and denied private-schema usage pass. No remaining documented
standard breaches were found on recheck.

Spec found missing consent rechecks for unchanged Occurrences and committed Call
edit invalidation; fixing the former exposed a self-booking conflict for unchanged
Primary Venue Occurrences. All three findings are fixed and covered by the local
RPC regressions. Physical-device software-keyboard verification remains open.

The complete browser suite finished with 20 passes and 15 failures. The confirmed
b041592 baseline has 21 passes and 13 failures; those 13 failures also occurred on
the branch. The two additional Calendar/navigation failures passed isolated reruns.
The new planning journey passes, including persistence, retries and permission loss.
The broad suite is not green, and its existing failures are not hidden by focused
results. Local migration history was repaired after direct isolated application;
the final forward migration is separately proven from the scratch baseline.
