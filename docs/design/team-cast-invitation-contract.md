# Reviewed Team Cast invitations (STA-73)

## Existing capabilities and gaps

`get_team_workspace` exposes accepted, active Theater Members in overlapping
Teams. `invite_event_cast_member` authorizes active Event leadership, creates one
pending `show_cast` row and projects a notification from `event.cast.invited`.
Existing Cast rows, including declined/withdrawn rows, cannot be invited again.
`respond_to_event_cast_invitation` records personal acceptance/decline; existing
Event and Callsheet queries derive participation and actions from that row.
Team membership grants no Event authority or participation.

The missing capabilities are a server-owned named review and a transaction that
sends its eligible recipients together. No new expiry, withdrawal, re-invitation
or Operator casting powers are introduced. Completed/cancelled Events remain
closed to casting, consistent with the existing UI and authorization layer.

## Contract

Only active Producers/Directors can read/create/send a review. Selection includes
whole Teams or explicit subsets of accepted Team Members. Whole Teams expand at
review time; overlap becomes one named recipient. Existing Cast rows are labelled
accepted, pending or otherwise already recorded and excluded. Ineligible selected
Members remain visible with an explanation.

A durable review stores its actor, Event, selection and ordered snapshot of Team
state and named recipients. Send accepts only its review ID; callers cannot
replace the stored recipient list. Current state is recomputed under locks. If
membership, eligibility, names, Team availability or Cast state changed, send
returns a new review and explanation with zero invitations. New whole-Team
Members therefore require a second explicit send of the refreshed named review.

Successful sends call the existing single-person invitation function inside one
Postgres transaction. Any failure rolls back Cast rows, activity and notifications.
The review records success so a lost-response retry returns the original receipt,
after rechecking current actor authority. Each recipient still accepts personally.

Lock order: ordered Theater memberships, selected Teams, Event, then existing
Cast rows, then recipient profiles (to stabilize reviewed names). Team commands already lock membership before Team; deactivation locks
membership before Team recovery. Teams are locked to prevent membership phantoms
through authorized Team commands. Event locking serializes existing invitation
writes; Cast row locks serialize recipient acceptance/withdrawal. Deadlocks or
serialization failures return retryable errors, never partial writes.

Tests use the agreed commands, database RPCs and browser seams. All execution is
against disposable local Supabase. Remote migration/seed remains a separate
operation requiring explicit maintainer approval.
