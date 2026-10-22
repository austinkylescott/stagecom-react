# Personal Call meaning (STA-78)

October 22, 2026. Implements the personal Call slice of the approved STA-76
specification, preserving the Callsheet hierarchy and Your Next Events agenda.

## Behavior

Confirmed Calls on the dashboard, desktop agenda and mobile disclosure show the
recorded Rehearsal/Performance type and Required/Optional Call requirement, with
Event and Theater context. The phone trigger stays a short next-date disclosure;
opening it reveals the full list. Every link retains its authorized Occurrence
anchor. Event workspace rows say **Next Event date** to distinguish Event context
from a person's assigned Calls.

All these dates use one formatter: UTC on the server and during initial hydration,
then the browser's timezone with an explicit abbreviation or offset. Each `<time>`
retains the original instant in `datetime`; the browser timezone controls both the
calendar date and clock time. A Call can therefore fall on the preceding day for
another viewer. The fall transition's repeated hour is distinguished by EDT/EST
or PDT/PST. Invalid dates show “Time unavailable” rather than throwing.

The authorized query preserves actual Call requirements and gathering types only
for accepted Cast or accepted Staff with active Theater membership. Publication
is independent. Producer, Director and Operator authority grants no attendance.
Pending invitees receive no personal Call schedule. Not-called, cancelled
Occurrences, cancelled/completed Events, past, unconfirmed/undated and invalid
instants are excluded. The dashboard and agenda use the same instant-based sort,
with Call identity breaking ties, and impose no presentation limit on the result.

## Verification

The approved seams are the authenticated Event commitment query, Callsheet read
model/upcoming Calls, component behavior and the authenticated Callsheet browser
journey. The disposable fixture has accepted Cast in North Stage and accepted
Staff in South Stage, six future Calls, both gathering types and both requirements,
New York/Los Angeles slot metadata across the 2030 fall transition, excluded
entries, and stale Call rows for a pending invitee and a leadership-only Operator.
The query must reject those stale rows rather than infer accepted participation.

The browser journey compares dashboard and sidebar instants and context, checks
UTC HTML with JavaScript disabled and local zoned output after hydration, opens
and dismisses the 390px agenda, and follows a Call to its Event anchor. The
existing response journey continues to accept an Admin invitation, reload and
retain the confirmed Call. Screenshots are implementation evidence, not maintainer,
uncoached-user, physical-device or branding acceptance.

Executed against disposable local Supabase after applying the full tracked
migration chain. No remote database writes or schema changes were needed. This
cloud environment's Docker VFS driver exceeded its 32 GB disk while extracting
the layered database image. Exporting the same official
`supabase/postgres:17.6.1.143` filesystem and importing it as one layer, preserving
its environment/entrypoint/command, allowed the unchanged migrations and real
Auth/PostgREST services to run. Unused services were excluded. This is a local
verification setup detail, not a repository runtime change.

- `npm run typecheck`, production build, changed-file ESLint, formatting and diff
  whitespace checks pass.
- Full Vitest suite: **202 passed, 1 skipped** across 65 files. The skip is the
  unrelated anonymous discovery test requiring the optional demo seed.
- Authenticated Callsheet browser suites: **12 passed, 3 skipped**. The skips
  require optional seeded demo personas. Disposable invitation, persistence,
  two-Theater Cast/Staff, timezone, phone disclosure and Occurrence-link journeys
  all executed. The final timezone scenarios also verify scrolling to the last
  Call and back to the first in the phone disclosure.
- Browser checks ran with the server in `Asia/Tokyo`, separate from the New York
  and Los Angeles browser zones. JavaScript-disabled pages rendered UTC; hydrated
  pages rendered the browser zone without a hydration mismatch.
- The regression test against the original query returned eight Calls, including
  two cancelled Occurrences, instead of the six eligible Calls. The original
  dashboard also reproduced a server/client timezone hydration mismatch. The
  implementation passes these checks.

Before captures use the original `264912c` presentation/query with the same
disposable fixture; after captures use this implementation. Desktop captures are
1280px wide; phone captures use the settled 390×844 viewport with the agenda open.

| Browser zone | Before desktop                                                   | After desktop                                                   | Before phone                                                 | After phone                                                 |
| ------------ | ---------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------- |
| New York     | [Desktop](personal-call-evidence/before-New_York-desktop.png)    | [Desktop](personal-call-evidence/after-New_York-desktop.png)    | [Phone](personal-call-evidence/before-New_York-phone.png)    | [Phone](personal-call-evidence/after-New_York-phone.png)    |
| Los Angeles  | [Desktop](personal-call-evidence/before-Los_Angeles-desktop.png) | [Desktop](personal-call-evidence/after-Los_Angeles-desktop.png) | [Phone](personal-call-evidence/before-Los_Angeles-phone.png) | [Phone](personal-call-evidence/after-Los_Angeles-phone.png) |

Maintainer acceptance, uncoached review and physical-device checks remain separate
follow-up evidence; these automated runs do not establish them.
