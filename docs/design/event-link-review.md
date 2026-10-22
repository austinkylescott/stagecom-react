# Callsheet Event destination names (STA-79)

The Callsheet's workspace and discovery links now take their accessible names
from the visible title, Theater/relationship/lifecycle metadata, and the adjacent
Event schedule summary. The title stays recognizable in a screen reader's links
list. The schedule uses the existing UTC-first, browser-local-after-hydration
format with an explicit zone, and remains Event context rather than a personal
Call. Destinations and authorized queries are unchanged.

A same-title Event in another Theater is identified by that Theater. Within one
Theater, lifecycle and the authorized next Event date distinguish the links.
Only when all available naming facts match does a visible “Matching Event 1 of 2”
qualifier appear. It describes the current result order, not an invented Event
identity; it can change when results change. Identical authorized facts cannot
provide a semantic distinction beyond that position. No route ID, hidden Cast
identity, withheld date or additional private read is used to resolve a collision.
Collision detection spans both workspace and discovery sections.

Rows keep their compact layout and independent Cast controls: five individual
avatars plus one control containing the remaining full names. Focus, Escape,
tap and outside dismissal remain available without following the Event link.

## Verification and limits

Component checks exercise the agreed Callsheet presentation seam: same title
across Theaters, distinct dates and lifecycle within one Theater, exact link
names and destinations, keyboard focus, and otherwise matching summaries with
withheld dates. The authenticated browser fixture uses real local Auth and
queries, two Theaters, four same-title Events, long wrapping titles, identical
undated drafts, and seven accepted Cast Members. It checks link-name uniqueness,
keyboard navigation into each authorized Event, individual/remaining Cast names,
Escape/outside dismissal and horizontal overflow at 1280px and 390px.

Evidence files in [event-link-evidence](event-link-evidence/) use the same fixture
for the original `59a64cd` component and the implementation. These automated
browser captures do not establish uncoached, physical-device, maintainer or
branding acceptance. There is no real screen-reader speech verification; checks
use the browser accessibility tree and keyboard interactions.

The disposable database applies the complete tracked migration chain. This cloud
environment uses Docker's VFS storage driver, which exceeded its 32 GB disk
while extracting the layered official Postgres image. Exporting that same
`supabase/postgres:17.6.1.143` filesystem and importing it as one layer, preserving
its environment, entrypoint, command, working directory and exposed Postgres
port, allowed the local stack to initialize. Only local test services and data
were changed.

Type checking, changed-file ESLint, formatting and the production build pass.
The full Vitest suite passes: **204 passed, 1 skipped** across 65 files; the
skip requires optional demo seed data. Authenticated browser checks pass: the new Event-link journey and the existing
response/reload/confirmed-Call journey both executed against local Supabase.
Three optional seeded-persona scenarios were skipped because their demo data is
not installed. The new fixture passed at both 1280×844 and 390×844 with no page or
console errors, no document/row horizontal overflow, distinct accessibility-tree
link names, keyboard navigation to all four authorized Events, and full names
through individual/remaining Cast controls. Baseline captures use the corrected
same fixture; the original component's accessible names contain only its title.

## Standards review

One finding: unrelated generated route-tree output from the build. It was
restored before the ticket commit. No further documented-standard violations or
actionable code smells were found.

## Specification review

One finding: the remaining-Cast fixture expected a name inconsistent with the
query's alphabetical sorting. The expectation was corrected and the real
browser journey passed. No implementation requirement remains unverified within
the automated seams above.

Both review findings are resolved.

| Evidence          | Before                                          | After                                             |
| ----------------- | ----------------------------------------------- | ------------------------------------------------- |
| Desktop, 1280×844 | [Original](event-link-evidence/before-1280.png) | [Implemented](event-link-evidence/after-1280.png) |
| Phone, 390×844    | [Original](event-link-evidence/before-390.png)  | [Implemented](event-link-evidence/after-390.png)  |

Cast-name evidence: [keyboard focus](event-link-evidence/cast-focus-1280.png)
and [phone tap](event-link-evidence/cast-tap-390.png).
