# Operational actor and state matrix

Status: seeded contract for prototype and acceptance work

The executable matrix lives in
`src/features/operational-workspaces/scenario-contract.ts`. It is the single
source for the prototype in STA-27 and the seeded acceptance journey in STA-56.
Those consumers may adapt surface identifiers to prototype screens or route
drivers, but they must import the scenario definitions unchanged. In
particular, they must not reinterpret a condition’s classification, audience,
action priority, relationship label, Calendar disclosure, or forbidden
disclosures.

## Contract shape

`operationalConditions` defines every seeded state once. When one domain state
has a different projection for different audiences, the projections use
separate identifiers. For example, incomplete public content is a Producer
personal commitment and a separate Operator-visible Operational Exception. A
single condition therefore never changes classification by viewer.

Every condition has exactly one of these classifications:

| Classification        | Meaning                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| Personal commitment   | An action expected from this person because of a current relationship.                         |
| Work Queue            | Shared unresolved Theater work this viewer is authorized to resolve.                           |
| Operational Exception | Important watch-only state that is not currently a resolvable decision for this viewer.        |
| Notification          | A personal domain-event alert whose read or dismissed state never changes shared state.        |
| Calendar occupancy    | A personal, detailed, or opaque time/resource projection shaped by the viewer’s relationships. |
| Ordinary information  | Useful context or a truthful blocked/empty/public state that is not attention work.            |

`operationalScenarios` gives every seeded person:

- relevant cross-Theater, Theater, Event, or public scope;
- an allowed Callsheet or public-Theater starting surface;
- a visible navigation path to the primary action;
- visible information and all six classified condition collections;
- personal and Theater Calendar disclosure;
- one primary action and relationship-labelled secondary actions;
- a primary viewport with required usability at the alternate width;
- focused alternate outcomes such as declined or stale decisions; and
- explicit forbidden disclosures.

Stable surface identifiers keep the contract independent from route structure.
`getOperationalScenariosForPersona` derives selections from the scenario data,
so a prototype persona picker or acceptance-session driver does not maintain a
second actor index.

## Seeded actor and state coverage

The executable collection covers every required persona and keeps state variants
as separate scenarios where the permitted experience changes. In addition to
the primary Owner, Admin, Producer, Director, Cast Member, Reviewer, Event staff,
base Member, no-Theater, and public journeys, it includes:

- Producer + Director + Cast Member and Admin + Reviewer + Producer multi-role
  combinations;
- pending Admin acceptance and declined invitation outcomes;
- separate pending and accepted Cast/Event-staff phases so acceptance gates Calls
  and scoped disclosure;
- revoked Admin access with immediate Member-level fallback;
- both eligible and blocked self-authored Proposal review;
- both Theater and Event Publication readiness;
- pre-submission planning and post-review requested Proposal edits;
- upcoming Calls as personal commitments and Calendar occupancy; and
- upcoming and cancelled public Event discovery.

## Reuse rules

The prototype should render from scenario data and record the scenario `id`
during walkthroughs. Validation notes can therefore cite the exact actor/state
contract they exercised. The later acceptance journey should use the same IDs
to create database fixtures and map `navigationPath` surface identifiers to
visible links or controls.

The following are adapters and may differ between prototype and production:

- the route or screen corresponding to a surface identifier;
- the clock dates and generated database identifiers;
- visual treatment; and
- the persistence setup needed to produce each canonical condition.

The following are contract and may change only through the STA-29 reconciliation
step after validation:

- condition classification and authorized audience;
- allowed starting surface and visible navigation path;
- primary versus secondary action priority and relationship labels;
- primary viewport and alternate outcomes;
- personal versus Theater Calendar detail; and
- forbidden disclosures.

## STA-27 prototype

The throwaway interactive prototype lives at
`/dev/operational-workspaces-prototype` on the STA-27 branch. Run it with:

```bash
npm run prototype:operational-workspaces
```

Use the seeded-journey selector to move among all contract scenarios. The URL
records the `scenario`, `surface`, and preview `viewport`, so a validation note
can link to the exact state under discussion. Phone and desktop controls switch
the same journey between its primary and alternate width without changing the
scenario contract.
