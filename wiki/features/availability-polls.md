# Availability polls

Implementation status: Implemented locally (STA-69); remote migration pending.

Event Producers and Directors open polls in Cast & Team by selecting an
Occurrence, its existing Candidate Slots and explicit accepted Cast respondents.
One poll may be open for an Occurrence. Its options and audience are fixed;
cancel and replace it to change either. Closed or cancelled polls retain their
submitted history and cannot reopen. Closure is explicit, without a deadline.

Selected respondents save private partial drafts and submit Available,
Unavailable or Uncertain for every option. Resubmission replaces their own
submitted set while open. Other selected eligible Cast and Event leadership see
named submitted answers and totals; private drafts remain visible only to their
author. Operator or staff authority alone gives no poll access.

Loss of active Theater membership or accepted Cast removes poll access. Leaders
retain historical answers and see the respondent marked ineligible, excluded
from totals. An independent accepted Cast relationship remains eligible even
when the person also has a staff assignment.

Submitting clears that poll's Callsheet response action while confirmed Calls
remain in the agenda. Poll answers do not update the legacy Candidate Slot
answers used by Proposal viability or At Risk evaluation. Selecting options does
not reserve a venue, confirm participation, approve or publish an Event.

The database serializes submission, closure and replacement and stores command
receipts for retries. Closure first rejects a new submission; submission first
commits and may be retried after closure. Stale versions reject overwrites. The
editing input stays visible after errors and refreshes. Persisted drafts survive
reload; unsaved editing changes require Save private draft to persist.

See [the confirmed capability and transaction contract](../../docs/design/availability-poll-contract.md).
Verification uses authenticated local demo personas, browser navigation and
database acceptance checks. Device software keyboard behavior and maintainer
presentation review remain separate review steps.
