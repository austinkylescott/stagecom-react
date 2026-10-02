# Published Theater and Event discovery (STA-74)

Status: implemented; remote integration pending operation approval.

`/theater` discovers published Theaters using an anonymous client and a narrow
public-field projection. The existing Theater destination lists upcoming published
Event snapshots through `get_published_theater_events`. Event destinations keep
using `get_published_event`; signing in never changes these public reads into
private reads. Unpublished Events and unpublished public-content revisions remain
unavailable. No public credits are invented and admission uses the delivered
external-provider or no-advance-ticketing contract.

Event destinations label the **Published presentation**, link back to the Theater,
and show complete 4:5 posters using `object-contain`. A 1080×1350 submission fits
without cropping. Original images open through a separate keyboard-accessible
link; absent or failed images have a neutral fallback. The fallback also detects
images that fail before hydration. Dates, locations, admission and permitted Cast
credits remain accessible text. Performance and admission details precede long
copy on phones. The private destination labels the **Current private plan** and
links back to the published presentation.

The additive `20261002202840_public_event_occurrence_context` migration adds the
existing snapshot's `occurrence_id` to the public JSON projection as `id`. It does
not expose live Occurrences, Candidate Slots, private plans or unpublished copy.
The function's anonymous-safe visibility predicate and grants stay intact. The
Event/Performance links enter the existing private route and retain its fragment
through the delivered sign-in return flow. Access is rechecked by the existing
private query; a public link grants no Event access. `id` remains optional in the
client contract so deployments with the older JSON projection can still show the
published page until the approved migration lands.

## Local review data

Run the existing scoped `demo:seed` against disposable local Supabase. Compass
Rose includes Calendar Performance with a complete poster, free admission and no
advance ticketing, and Public Stories with long copy, an unavailable poster and
external tickets. Each has a published revision and a distinct unpublished
working revision. A Midsummer Night's Dream remains private. Publication and
working revisions are persisted through the delivered RPCs; the operational
Calendar fixture retains its existing approved-plan setup. Scoped cleanup removes
only owned public Occurrence snapshots before their Events, so seed reruns pass.
Remote seeding still requires explicit approval.

## Verification

- Component tests verify complete-poster/original access, missing-poster fallback,
  admission, published labels and Performance identity links.
- A real anonymous-query integration test verifies discovery, exact published
  content, snapshot IDs, unpublished not-found and direct private-table denial.
- `e2e/public-programming.spec.ts` verifies 390px composition, long copy, broken
  images, keyboard navigation, private/public revision separation, sign-in return
  fragments, Producer access, unrelated-Member denial, loading, failed requests
  and retry. Phone screenshots are generated in `test-results/`.
- The migration applies on disposable local Supabase. The public schema matches
  committed types; local CLI output differs in formatting, included GraphQL
  schema and PostgREST metadata. No committed type change is needed for JSON.
- The broader existing pgTAP suite fails on seeded global counts and retired
  function signatures. STA-74's public-query and browser checks pass independently.

The neutral component foundation is preserved. This work does not approve or
change the separate branding direction.
