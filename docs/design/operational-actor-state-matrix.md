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
- one primary action and relationship-labelled secondary actions; and
- explicit forbidden disclosures.

Stable surface identifiers keep the contract independent from route structure.
`operationalScenarioIdsByPersona` is exhaustive, so a prototype persona picker
or acceptance-session driver can select scenarios without duplicating its own
actor list.

## Seeded actor and state coverage

| Scenario                                        | Personas and relationships                        | Primary path                                    | Primary action                             | Key secondary coverage                                                            |
| ----------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `owner-operator-pressure`                       | Owner, Theater Operator                           | Callsheet → Theater Operations → Event Overview | Resolve an At Risk Event                   | Proposal review, cancellation, Publication, Admins, ownership transfer            |
| `admin-staffing-calendar-and-successorship`     | Admin, Theater Operator, proposed successor       | Callsheet                                       | Accept or decline ownership transfer       | Staffing, detailed Theater Calendar, peer Admin access                            |
| `producer-counteroffer-and-public-content`      | Producer                                          | Callsheet → Event Overview → Review             | Respond to an expiring Counteroffer        | Operational plan and public-content commitments                                   |
| `director-cast-and-participation`               | Director                                          | Callsheet → Event Overview → Cast & Team        | Complete a viable cast plan                | Availability Responses and Occurrence Calls                                       |
| `cast-member-invitation-availability-and-calls` | Invited/accepted Cast Member                      | Callsheet → Event Overview → Cast & Team        | Respond to a Cast invitation               | Availability and personal Calls                                                   |
| `designated-reviewer-exact-revision`            | Reviewer without unrelated Admin authority        | Callsheet → Event Overview → Review             | Decide the exact Proposal Revision         | Counteroffer and hold-expiry context                                              |
| `event-staff-assignment-and-calls`              | Invited/accepted Event staff member               | Callsheet → Event Overview → Cast & Team        | Respond to an Event Staff Assignment       | Bounded responsibility, logistics, and selected Calls                             |
| `base-member-calendar-and-people`               | Base Theater Member                               | Callsheet → Theater Calendar                    | Plan around opaque Primary Venue occupancy | Published/related Events and privacy-safe People directory                        |
| `multi-role-producer-director-cast`             | Producer, Director, Cast Member                   | Callsheet → Event Overview → Review             | Respond to the Producer Counteroffer       | Separate Cast availability, Director casting, and Producer content actions        |
| `multi-role-admin-reviewer-producer`            | Admin, Reviewer, Producer                         | Callsheet → Theater Operations → Review         | Review an eligible revision                | Producer commitment, shared staffing, blocked self-review, per-Theater disclosure |
| `authenticated-without-theater-scope`           | Authenticated person with no Theater relationship | Callsheet                                       | Create a Theater                           | Join by invitation or Reusable Join Link; no Theater navigation                   |
| `public-upcoming-event-discovery`               | Public visitor                                    | Public Theater → Public Event                   | Open an upcoming published Event           | Published admission action and allowlisted content                                |
| `public-cancelled-event-discovery`              | Public visitor                                    | Public Theater → Public Event                   | Open a clearly cancelled published Event   | Continued discovery until the final scheduled Performance passes                  |

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
- personal versus Theater Calendar detail; and
- forbidden disclosures.
