# Theater and Event navigation foundation (STA-67)

Status: implemented; neutral presentation awaits maintainer review.

The named Theater destination (`/app/:theaterSlug`) is a Member portal with
programming, Calendar, and community entrances. Owner/Admin Operations lives
at `/app/:theaterSlug/operations`; its server query rechecks Operator authority.
Shared Reviewer decisions remain accessible through Callsheet and the authorized
Event portfolio. No persona or product role switch appears in the workspace.

The existing Event portfolio includes unscheduled Events, independently labeled
Lifecycle, Proposal decision, Publication, and Operational health, and the next
relationship-authorized action. Limited participant and public cards retain
their existing disclosure boundaries. An empty authorized result is distinct
from filters matching no Events.

Event destinations keep their Theater and Event identity across sections and
provide an explicit return to the portfolio. Overview shows typed Rehearsals and
Performances in chronological order, distinguishing proposed times, confirmed
commitments, and unscheduled Occurrences. The order uses the confirmed time,
otherwise the earliest candidate; undated Occurrences follow dated ones. Planning
editor position and persisted schedule rules are unchanged.

Producer planning, Director coordination, Cast Availability, invitation decisions,
and existing Review/risk actions are labeled with their relationships. Accepted
Cast plus staff no longer loses Cast planning because of staff precedence. Staff
without Cast retains only assigned Occurrences in its planning read. Pending
invitees receive the coarse invitation plan and decision controls, without
Occurrence details, Availability, Calls, or accepted-Cast planning.

Existing Availability, Call, Counteroffer, and Proposal fragments open the section
containing their target. New Overview Occurrence anchors select the dated entry.
HTTP redirects cannot read fragments: sign-in captures the browser-retained
fragment into validated `next`, then the existing Supabase callback returns there.
The destination still authorizes current membership and Event relationships.
Calendar period/selection and move workflows remain STA-68 scope.

## Review data

Run the existing `demo:seed` against local Supabase. The development-only chooser
includes a Pending Cast invitee. The Producer has independent accepted Cast,
Producer, and Director relationships. Compass Rose also contains an unscheduled
long-title Event. No remote seeding or migration is needed for this slice.

## Verification

The database-backed browser journey in `e2e/event-portfolio.spec.ts` covers the
Member portal, denied Operations access, unscheduled/empty presentation, reverse
position versus chronological dates, long unbroken titles, keyboard links,
pending-invitee disclosure, persisted acceptance, combined staff/Cast/leadership,
real Supabase OTP callback return, and membership loss. The seeded-persona journey
in `e2e/theater-navigation.spec.ts` provides Member, Owner, leader, and invitee
review screenshots at desktop and phone widths. Existing Callsheet and Cast
invitation browser regressions are retained.

Viewport checks at 360px and 390px do not prove actual-device software-keyboard
behavior. Automated checks do not establish uncoached usability, approve branding,
or replace page-by-page maintainer presentation review. No schema, invitation
lifecycle, Publication, or mutation authorization contract is replaced.

The full unit suite passed (170 tests, 52 files), type checking passed, and the
production build passed. Focused Callsheet (four scenarios), Cast invitation,
portfolio, and seeded-persona browser checks passed. The entire unrelated
browser suite was not run; no database migration or transaction changed.
Remote dev migration inventory was inspected read-only; test writes and demo
seed runs used only the already-running local Supabase stack. Two demo seed
runs succeeded. The browser suite logs expected authorization boundaries;
Playwright screenshot caret injection can produce a development hydration warning.
