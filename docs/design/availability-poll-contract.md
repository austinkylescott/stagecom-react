# Availability poll capability map (STA-69)

Status: confirmed by the maintainer on 2026-10-01 for STA-69.

## Existing capabilities

- `show_occurrences` and `show_candidate_slots` provide Event-scoped planning
  dates. Candidate Slots are mutable planning records, not frozen poll options.
- `show_cast` records explicit invitation acceptance independently of leadership
  and staff assignments. Active Theater membership is checked by existing
  authorization helpers.
- `show_availability_responses` stores one versioned answer per person and
  Candidate Slot. `record_candidate_slot_availability` supports command retry
  and optimistic version checks, but each call writes only one option.
- The legacy write permission accepts pending and accepted invited Cast; the
  Event query/UI exposes response editing only to accepted Cast. Preserve that
  existing contract rather than reusing it as the new poll authorization rule.
- Legacy coordination RLS permits operational viewers and accepted Cast reads;
  the application read model further restricts non-operational viewers to their
  own answers. Neither layer expresses a selected poll audience.
- Legacy answers affect Proposal preparation, approval viability and approved
  Event At Risk evaluation. Poll comparison must not silently change those
  scheduling contracts.
- Callsheet availability actions currently originate from counteroffer-specific
  `show_availability_requests`; poll actions need their own unresolved-work read.
  Confirmed Calls are loaded independently and must remain after submission.
- Existing activity events, typed errors, authorized feature commands and thin
  server functions provide the integration pattern. The demo seed and browser
  persona journeys provide real authenticated review data and navigation.

There is no persisted poll lifecycle, selected respondent snapshot, frozen option
snapshot, private editing draft or atomic multi-option submission.

## Confirmed decisions

1. Freeze options and selected accepted Cast respondents on opening. Changing
   either cancels/replaces the poll atomically; retain cancelled/closed submitted
   history. No reopening or automatic deadline closure.
2. Loss of accepted Cast or active Theater membership removes access and write
   eligibility immediately. Leaders retain historical answers, visibly mark the
   respondent ineligible, and exclude those answers from current totals.
3. Current eligible selected respondents and active Producer/Director
   relationships may read named submitted answers. Operator, Reviewer or staff
   authority alone does not grant poll access. Drafts are private to their author.
4. Persist partial editing drafts separately from complete submitted answers.
   Resubmission atomically replaces only that person's submitted set, while open.
5. Serialize submission, closure and replacement on the poll row. A submission
   that commits before closure is accepted; closure first rejects submission.
   Deduplicate commands, including retry after closure of a successful submit.
   Stale versions reject rather than overwrite newer answers. Preserve recoverable
   input on errors, but never expose drafts to leadership or other respondents.
6. Poll answers remain separate from legacy answers used by Proposal and risk
   evaluation. Submission changes poll work only, without changing Calls,
   Confirmed Slots, resource holds or booking readiness.
7. Store option timestamps as instants and snapshot the Theater time zone for
   display. Reject nonexistent or ambiguous local entry times rather than guess.

## Implementation and verification boundary

Extend the database with forward migrations, RLS and
authorized transaction RPCs. Do not mutate answered Candidate Slots to represent
new options. Recheck relationship eligibility inside transactions; protect
membership/participation changes from racing authorized writes. Use one open
poll per Occurrence enforced by a database constraint, not a UI check.

The already accepted primary test seam is the authenticated browser journey.
Cover leader creation/comparison/closure, selected Cast drafts/submission/reload/
resubmission, denied public/pending/unrelated/staff access, Callsheet clearing,
confirmed Call preservation, keyboard access and 360–390px phone viewports.
Use database transaction checks for retry, stale versions, complete answer sets,
one-open-poll enforcement and submit/close ordering. Local migrations and types
must be verified before delivery. Remote migrations and seeding require separate
explicit approval. Viewport emulation does not prove device keyboard behavior.
