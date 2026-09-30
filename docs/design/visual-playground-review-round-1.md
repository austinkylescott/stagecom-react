# Visual playground — first human review

Date: September 30, 2026. Source: maintainer feedback in the prototype thread.
Status: A sidebar is the structural starting point. Neutral shadcn skeleton
before branding. No final visual system or production implementation approved.

## Accepted refinement direction

- Sidebar order: Callsheet; one Calendar entrance; Theater; People. Mobile
  navigation becomes a drawer/sheet, rather than wrapping into horizontal links.
  Calendar must also retain discoverable access to unscheduled Event records.
- Callsheet: required actions in a list; confirmed schedule in its own adjacent
  timeline column. Responded/cleared items leave the action list. Mobile stacks
  these without confusing Candidate Slots with confirmed commitments.
- Notifications belong with account information at the sidebar bottom and open
  a pane. Mobile uses a notification button and account avatar at top right.
  Notification dismissal does not resolve domain work.
- Preserve full poster content. Existing submissions are 1080×1350 (4:5), with
  no predictable placement of key information. First experiment: full 4:5
  presentation, separate accessible text, and access to the original poster.
  No new submission guidelines or dimensions selected.
- Keep Daybook and month. Reduce duplicate date headings; add month/year
  controls. Compare agenda patterns before committing to a calendar library.
- One Event workspace: a Theater has Events; an Event has typed Occurrences.
  Calendar entries select an Occurrence inside that same Event destination.
  Public viewers get published poster, time, public credits, eventual tickets;
  connected people receive only relationship-authorized content. Public cast
  credits and ticket integration are not invented in the fixture.
- Display Occurrences as a chronological timeline/Daybook. Simplify repeated
  internal metadata and contextualize controls rather than making another
  separate calendar item destination.
- Use basic shadcn composition before layering in branding and bespoke behavior.
  This refines the visual brief; it does not replace production styles today.

## Product questions to workshop before specification

**Availability as a scheduling poll.** The maintainer wants a list of possible
options that participants can answer, and Producer/Director comparison of
responses to choose a suitable time. The goal is less scheduling conversation.
The existing one-option demo is insufficient and retained only as an old
bounded response fixture. Next exploration should compare a phone-friendly
multi-option response list and a Producer/Director response matrix.

Open: who creates/edits/closes options; one versus multiple selections and
uncertain responses; response deadlines and late edits; option changes after
responses; comparison and missing responses; who can choose a target; and what
review/confirmation makes that target a Confirmed Slot. A poll answer or chosen
option must not silently reserve a venue or create a Call. Existing scheduling
approval and authorization constraints remain in force.

**Teams in the directory and casting.** Team is the preferred candidate term
rather than Troupe/Group. A Member may be on multiple Teams. Example fixture:
Austin, Eno and Elijah in Ants 2 Gods; Austin additionally in The Management;
Eno additionally in Eno & Dan French. Avatars should facilitate groupings,
discovery and selection. Casting should support selecting a whole Team or a
subset of its people.

Open: Theater scope, membership ownership and invitations, visibility, Team
identity, who may edit membership, cross-Theater behavior, Team history, and
how a Team selection expands into individual Cast invitations. Team membership
must not implicitly grant accepted Event Cast participation. This is future
workshop input, not a schema or security contract.

**State labels.** Draft, Unlisted, Private and Public are proposed vocabulary for
simpler surfaces. Draft lifecycle and Publication remain independent. Unlisted
has no settled link/discoverability authorization semantics; do not implement
it as a new visibility mode without specification. Separate public snapshot,
working copy, operational approval and health should remain understandable.

## Calendar component investigation

The current prototype grid/Daybook are custom fixture layouts, not shadcn
Calendar. [Official shadcn Calendar documentation](https://ui.shadcn.com/docs/components/base/calendar)
describes date/range selection built on React DayPicker. It is a plausible
basis for date selection or a customized month composition, but is not an
out-of-the-box programming/booking workspace.

For comparison, [FullCalendar List View documentation](https://fullcalendar.io/docs/list-view)
shows dated lists for day/week/month/year intervals. Its grouping and empty
period behavior are useful references; no dependency or architecture choice
has been made. Evaluate actual information density, touch targets, selected
Occurrence navigation, opaque occupancy and keyboard access before choosing.

## Changes in this round

A uses neutral surfaces, system type and shadcn primitives. Desktop sidebar is
retained; phone navigation is a shadcn sheet. Notification/account sheets are
available from the correct shell locations. Callsheet responses clear after
submission; confirmed Calls form a separate timeline. Posters preserve 4:5.
Period controls support month/year URL state and empty periods without copying
October bookings to fictitious dates. Event Overview includes its Occurrences
with contextual selection, preserving public/pending restrictions.

B and C remain comparison references. The shared response-removal and poster
changes apply across directions to preserve task equivalence. Availability
polling and Teams have not been implemented or specified in this round.

## Next checkpoint

Review the refined A skeleton. Then workshop multi-option Availability and
Team-aware directory/casting, compare agenda layouts, and finalize terminology.
Capture the resulting decisions in a spec; create tickets; implement in a
separate production phase. Source capture commits still need explicit approval.

## Refinement checks

Typecheck, build, scoped ESLint and whitespace checks passed. Temporary Chromium
checks exercised the ordered mobile drawer, notification dismissal, response
removal, month/year URL navigation and empty periods, confirmed schedule,
selected Occurrence navigation, and public/pending timeline withholding.
Phone (390px) and desktop (1440px) screenshots were inspected; no page errors
or page-wide overflow were observed. Human evaluation of this refinement,
real software-keyboard checks and a final component/library choice remain open.
