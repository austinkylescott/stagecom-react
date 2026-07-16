# Stagecom Domain

Stagecom is a theater-operations product that coordinates theater membership, performance development, casting, scheduling, review, and public presentation.

## Organizations And People

**Theater**:
An organization that operates a performance community and controls its own membership, programming, public identity, and operational history.
_Avoid_: Company, tenant, account, organization

**Theater Member**:
A person with active membership in a Theater. A person may belong to multiple Theaters.
_Avoid_: User, performer, employee

**Owner**:
The Theater Member with final authority for the Theater.

**Admin**:
A Theater Member authorized to manage the Theater without holding ownership.
_Avoid_: Manager

**Producer**:
An Event collaborator responsible for its proposal, logistics, public presentation, and communication with Theater management.

**Director**:
An Event collaborator responsible for casting and artistic participation across the Event's Occurrences.

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

**Primary Venue**:
The Theater's default physical location and initial exclusive scheduling resource.

## Casting And Participation

**Proposed Cast**:
The accepted Cast Members deliberately selected by a Producer for a Proposal Revision.

**Minimum Viable Cast**:
The smallest confirmed cast with which an Event can responsibly proceed.
_Avoid_: Minimum attendance

**Occurrence Call**:
A Cast Member's participation expectation for one Occurrence: required, optional, or not called.
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
The explicit way audience admission is handled: Stagecom, an external provider, or no advance ticketing.
_Avoid_: Admission type
