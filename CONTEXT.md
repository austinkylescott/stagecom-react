# Stagecom Domain

Stagecom is a theater-operations product that coordinates theater membership, performance development, casting, scheduling, review, and public presentation.

## Organizations And People

**Theater**:
An organization that operates a performance community and controls its own membership, programming, public identity, and operational history.
_Avoid_: Company, tenant, account, organization

**Theater Member**:
A person with active membership in a Theater. A person may belong to multiple Theaters.
_Avoid_: User, performer, employee

**Former Theater Member**:
A person whose Theater membership has ended while their Theater-local participation and history remain preserved.
_Avoid_: Inactive Member

**Owner**:
The single Theater Member with final authority for the Theater. Ownership may be transferred to another Theater Member.

**Admin**:
A Theater Member who has accepted authority to manage the Theater without holding ownership.
_Avoid_: Manager

**Admin Invitation**:
A pending offer of Admin authority to an active Theater Member. Admin authority begins only when the recipient accepts.
_Avoid_: Targeted Invitation

**Theater Operator**:
An Owner or Admin acting with Theater-wide operational responsibility.
_Avoid_: Manager, when referring collectively to Owners and Admins

**Callsheet**:
A person's cross-Theater view of current commitments, relevant Events, decisions, and schedule.
_Avoid_: Theater Callsheet

**Theater Operations**:
The Theater-wide view of current decisions, exceptions, Event work, and schedule available to Theater Operators.
_Avoid_: Theater Callsheet

**Work Queue**:
The shared set of unresolved, actionable Theater decisions derived from current Theater and Event state. It is distinct from personal Notifications and watch-only Operational Exceptions.

**Operational Exception**:
A time-sensitive or potentially risky Theater condition that warrants attention but does not currently require a Theater Operator decision.
_Avoid_: Work Queue item

**Notification**:
A personal alert derived from a domain event. Reading or dismissing it does not alter the underlying Theater or Event state.

**Producer**:
An Event collaborator responsible for its proposal, logistics, public presentation, and communication with Theater management.

**Director**:
An Event collaborator responsible for casting and artistic participation across the Event's Occurrences.

**Event Staff Assignment**:
A Theater Member's accepted operational responsibility for an Event, initiated by a Theater Operator. The assignment may carry Calls for selected Occurrences.
_Avoid_: Resource request

**Cast Member**:
A Theater Member who has explicitly accepted participation in an Event.
_Avoid_: Performer, when referring to Event participation

**Reviewer**:
An Owner, Admin, or explicitly designated Theater Member authorized to decide an Event Proposal Revision.

## Programming And Scheduling

**Event**:
The continuous record of a proposed or approved public performance program, from its first draft through completion or cancellation.
_Avoid_: Show, production, sub-event

**Occurrence**:
One gathering belonging to an Event, initially either a Rehearsal or a Performance.
_Avoid_: Sub-event, date

**Rehearsal**:
An Occurrence that prepares the cast for its Event.
_Avoid_: Practice

**Practice**:
A standalone activity not tied to preparing one Event.
_Avoid_: Rehearsal, when the activity is not Event-specific

**Performance**:
An Occurrence presented to an audience.

**Candidate Slot**:
A possible date, time, and place for an Occurrence that has not been committed.
_Avoid_: Occurrence, proposed date

**Confirmed Slot**:
The date, time, and place committed to an Occurrence.

**Theater Calendar**:
A resource-aware schedule of committed Occurrences, temporary holds, and Schedule Blocks. Active Members may see that a resource is unavailable even when they are not authorized to see the underlying details.

**Schedule Block**:
A non-recurring, Operator-managed Primary Venue reservation for maintenance,
rentals, or other activity that is not an Event. It records a private label,
optional notes, creator, lifecycle, and factual history; it shares the
buffered non-overlap guarantee with Confirmed Slots and active exclusive holds.

**Primary Venue**:
The Theater's default physical location and initial exclusive scheduling resource.

## Casting And Participation

**Proposed Cast**:
The durable set of accepted Cast Members deliberately selected by a Producer for the Event's next Proposal Revision. Temporary editor choices are not part of the Proposed Cast until recorded.

**Minimum Viable Cast**:
The smallest confirmed cast with which an Event can responsibly proceed.
_Avoid_: Minimum attendance

**Occurrence Call**:
A Cast Member's or assigned Event staff member's participation expectation for one Occurrence: required, optional, or not called.
_Avoid_: Attendance

**Availability Response**:
A Cast Member's available, unavailable, or uncertain response to a Candidate Slot.

## Review And Publication

**Proposal Revision**:
An immutable snapshot of an Event's operational plan submitted for Theater review.
_Avoid_: Event, application

**Counteroffer**:
A Reviewer's concrete alternative Confirmed Slot offered to the Producer with an exclusive temporary hold.
_Avoid_: Requested edit, suggestion

**Operational Approval**:
The Theater's acceptance of one Proposal Revision's schedule, viability, and resource commitments.
_Avoid_: Publication

**Publication**:
The act of making an approved Theater or Event visible to the public.
_Avoid_: Approval

**Public Content Revision**:
A numbered snapshot of an Event's public copy, admission, and permitted Cast credits. It is either the unpublished working presentation or the exact presentation selected for Publication.

**At Risk**:
An operational health condition requiring human management because an approved Event no longer satisfies a commitment such as its Minimum Viable Cast.
_Avoid_: Failed, cancelled

## Admission

**Targeted Invitation**:
A single-recipient link authorizing a specific person to join a Theater.

**Reusable Join Link**:
A revocable link whose possession authorizes immediate base membership in a Theater.
_Avoid_: Public application

**Sales Channel**:
The explicit way audience admission is handled: an external provider or no advance ticketing. Native Stagecom ticketing is not an initial Sales Channel.
_Avoid_: Admission type
