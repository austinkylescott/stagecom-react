# Theater Calendar review (STA-68)

Status: implemented locally; neutral presentation awaits maintainer review.

The selected Theater Calendar defaults to a monthly Daybook. Month and year
selection, previous/next periods and the retained Week view all use validated
URL search parameters. Month stepping uses calendar arithmetic; days and entry
times use the Theater timezone. Buffered venue occupancy that crosses midnight
appears on each affected day. Empty periods show no invented activity.

Event links carry the Calendar view, period and selected entry, and select the
Occurrence in Event Overview. Ordinary navigation records selection on the
Calendar history entry before opening the Event. Browser Back and Back to
Calendar restore context; opening the Event in another tab retains its explicit
Calendar return link. Operator-visible Schedule Blocks open their own management
entry on the Calendar, rather than an Event.

Quick details appear on mouse hover or keyboard focus. The Details button
supports touch and explicit expansion; Escape dismisses details. Details overlay
the page so disclosure does not shift nearby links. The month grid aligns
weekdays on desktop and stacks readable dated sections on phones.

## Data and authorization

The existing reservation read remains the source for Primary Venue occupancy.
Confirmed Slots, unexpired pending Counteroffer holds and Schedule Blocks have
separate text labels. Venue intervals include setup and turnover buffers.
Confirmed offsite Occurrences use the existing confirmed-slot relationship and
never create venue reservations. Unconfirmed Candidate Slots create no entries.
No schema, scheduling mutation, Publication or Notification behavior changes.

Active Theater membership is checked before service-role reads. Operators see
operational details; leadership and accepted Cast retain relationship access.
Staff-only detail is limited to called confirmed Occurrences, matching the Event
workspace's staff scope. An unrelated Member receives only opaque venue timing,
without private titles, locations, occurrence identifiers, source or destinations.
Unrelated offsite activity is omitted because it does not occupy the venue.

The demo seed adds a Primary Venue Performance on the 10th, a pending hold on the
12th and an Operator Schedule Block on the 14th of the seed month. These persisted
review scenarios remain inside the owned Compass Rose demo Theater. The existing
Midsummer offsite commitment, pending invitee and long unscheduled Event remain.
Review fixture setup uses persisted records; it does not establish new command
or approval behavior. Remote migration or seed execution was not performed.

## Verification and review limits

The focused Playwright journey uses real local Supabase Auth and database reads
for Owner, Producer, Member and pending invitee sessions. It checks month/year
and empty-period navigation, Event/Occurrence links, both return paths, Schedule
Block destinations, opaque occupancy, offsite disclosure, reload persistence,
unauthorized Theater access, keyboard focus, touch details and page overflow at
360, 390 and 1280 pixels. A focused transport interruption verifies Calendar error
and retry presentation while successful reads continue to use the real database.
The existing STA-67 navigation journey is also checked for regression.

Focused date tests cover short months, leap years, year boundaries, overnight
intervals and daylight savings. Projection tests cover private field redaction,
unrelated offsite omission and staff-only called-Occurrence scope.

Viewport and touch emulation do not establish actual-device software-keyboard
behavior. No human presentation or uncoached usability review is claimed.
Maintainer page review and branding remain separate later gates. Week remains
available; no production view is retired by inference.

Verified on 2026-10-01: typecheck, production build and targeted ESLint pass.
The full unit/integration suite passed 175 tests; the subsequently added focused
Operations venue-summary regression also passed. Both the Calendar journey and
existing Theater navigation journey passed against the local database. Expected
transport errors are produced only by the focused failure/retry scenario.

## Maintainer review

- Review Daybook density, month navigation and empty periods.
- Review desktop month alignment and phone stacking.
- Review quick details with mouse, keyboard and touch.
- Review Event selection and both Calendar return paths.
- Review the distinction between holds, commitments, offsite work and blocks.
- Review opaque occupancy as an uninvolved Member and as a pending invitee.
- Record accepted, revised or deferred presentation findings before branding.
