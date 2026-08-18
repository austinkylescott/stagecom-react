# Operational Workspaces And Role-Aware Experience Spec

Status: accepted and published to Linear as STA-25

## Problem Statement

Stagecom has an acceptance-proven domain path from Theater creation through Event Publication, but the product does not yet make that path understandable or discoverable. The primary customer is a Theater Operator, yet the Theater landing page is a placeholder, the personal Callsheet is primarily a Theater picker, navigation exposes the same destinations to every Member, and management work is buried inside long Event pages. Existing acceptance tests prove commands and authorization by navigating directly to routes; they do not prove that a person can identify what needs attention or find the correct action.

The current presentation also treats lower-privilege experiences too much like reduced management screens. A person may be an Admin, Producer, Reviewer, Cast Member, and Event staff member during the same period. They need one coherent Stagecom identity and stable application structure, while their information and actions remain governed by their current Theater and Event relationships.

The next product milestone must therefore turn the existing operational engine into an intuitive, role-aware operating experience. It must also fill the supporting capability gaps that the resulting experience exposes: real Callsheet and Theater Operations surfaces, a trustworthy Theater Calendar, explicit Schedule Blocks, accepted Event Staff Assignments, Admin and ownership workflows, readable Notifications and activity, and public Event discovery from a Theater page.

## Solution

Stagecom will provide one stable, responsive application shell organized around personal work, Theater context, and durable domain destinations rather than role modes.

Every authenticated person lands on a personal **Callsheet** that aggregates relevant work and schedule across their Theater memberships. It separates personal commitments from shared Theater work the person is authorized to resolve. Entering a Theater is an explicit scope change. The Theater landing page becomes **Theater Operations**, a concise Operator cockpit centered on actionable decisions, urgent exceptions, and the upcoming Theater Calendar.

The product will preserve a recognizable structure as a person moves among Member, Producer, Director, Cast Member, Reviewer, Event staff, Admin, and Owner relationships. Navigation destinations remain stable when they have meaningful content, while protected configuration destinations appear only to authorized Theater Operators. Stagecom will not ask a person to choose a role mode.

The Event workspace will be decomposed into stable sections: Overview, Schedule & Plan, Cast & Team, Review, Public Page, and History. Overview will orient every authorized person with independent Event states, their relationships, one highest-priority next action, other available actions, the next Occurrence, participation and staffing summaries, operational risk, and public status.

The **Work Queue** will contain only unresolved actions an authorized person can take. **Operational Exceptions** will present time-sensitive or risky conditions that merit awareness but are not currently resolvable by that viewer. **Notifications** will remain personal alerts derived from domain events; reading or dismissing them will never mutate shared Theater or Event state.

The **Theater Calendar** will combine committed Occurrences, active temporary holds, and explicit Schedule Blocks for the Primary Venue. Theater Operators and involved people receive authorized details. Other active Theater Members see only opaque occupancy such as “Primary Venue unavailable.” The personal Calendar shows only the person’s own Events, Occurrences, Calls, and accepted commitments; it does not aggregate opaque occupancy from every Theater.

Each Theater will have exactly one transferable Owner. Owner and Admin remain separate relationships that both grant Theater Operator authority. Owners and Admins may invite or remove peer Admins, but nobody may alter the Owner except through an accepted ownership transfer. The transfer explicitly chooses whether the former Owner remains an Admin or Member, defaulting to Admin.

The milestone will retain the existing visual direction: public surfaces have civic poster/playbill energy and authenticated surfaces feel calm, readable, and operational. The redesign prioritizes information architecture, task hierarchy, interaction, disclosure, responsive behavior, empty states, loading states, and error recovery before broader visual rebranding.

Before production restructuring, the complete experience will be represented through an actor/job/state/next-action matrix and a throwaway interactive prototype. The prototype must be validated through uncoached scenario walkthroughs. Prototype and validation work may block implementation tickets derived from this spec.

### Actor, Job, State, And Next-Action Matrix

| Actor or relationship | Primary job                                                           | Relevant scope                                                               | Typical next actions                                                                                        |
| --------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Authenticated person  | Understand all current commitments without choosing a role mode       | Cross-Theater Callsheet and personal Calendar                                | Open the highest-priority commitment, enter a Theater, review upcoming Calls                                |
| Owner                 | Hold final Theater authority while operating the Theater              | Callsheet, Theater Operations, People, Settings, Events                      | Resolve shared work, manage Admins, transfer ownership, use an explicit self-approval override when allowed |
| Admin                 | Operate the Theater without ownership                                 | Callsheet, Theater Operations, People, Settings, Events                      | Review Proposals, publish, resolve risk and cancellation, manage Members/Admins, assign Event staff         |
| Theater Member        | Belong to and understand the Theater community                        | Theater Calendar, Events, People                                             | Browse published or related Events, see opaque venue occupancy, identify Operators                          |
| Producer              | Develop and submit the Event plan and public presentation             | Event Overview, Schedule & Plan, Review, Public Page                         | Complete blockers, respond to requested edits or Counteroffers, prepare public content                      |
| Director              | Coordinate casting and participation                                  | Event Overview, Cast & Team, Schedule & Plan                                 | Invite Cast, review participation and Availability Responses, assign Calls                                  |
| Cast Member           | Respond to and fulfill accepted Event participation                   | Callsheet, personal Calendar, Event Overview and authorized Cast information | Accept or decline invitation, submit availability, review Calls, withdraw when necessary                    |
| Reviewer              | Decide submitted Proposal Revisions without unrelated Admin authority | Callsheet, Event Overview, Review                                            | Approve, request edits, deny, or issue a Counteroffer when eligible                                         |
| Event staff member    | Accept and fulfill a named operational responsibility                 | Callsheet, personal Calendar, Event Overview, scoped Cast & Team information | Accept or decline assignment, review responsibility, logistics, and Occurrence Calls                        |
| Public visitor        | Discover trustworthy published programming                            | Public Theater and Event pages                                               | Scan upcoming Events, see cancellation state, open the Event, follow admission action                       |

### State, Surface, And Resolution Matrix

| Condition                                                           | Surface classification                                                   | Authorized audience                                              | Resolution or next action                                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Proposal Revision awaits a decision                                 | Work Queue                                                               | Eligible Reviewers and eligible Theater Operators                | Review the exact revision                                                                                     |
| Proposal author cannot review their own revision                    | Visible blocked work                                                     | Author and other eligible Reviewers                              | Explain that another Reviewer is required; expose Owner override only when configured and explicitly eligible |
| Event is At Risk                                                    | Work Queue                                                               | Theater Operators                                                | Revise, reschedule, allow with a reason, or cancel                                                            |
| Producer requests cancellation                                      | Work Queue                                                               | Theater Operators                                                | Make and record the final cancellation decision                                                               |
| Theater or Event is operationally ready for Publication             | Work Queue                                                               | Theater Operators                                                | Preview and publish the exact eligible snapshot                                                               |
| Approved Event lacks Producer-owned public content                  | Producer commitment plus Operator-visible Operational Exception          | Producer and Theater Operators                                   | Producer completes content; Publication does not enter the Work Queue yet                                     |
| Required Event staff need is unfilled                               | Work Queue                                                               | Theater Operators                                                | Invite an eligible Theater Member and keep the need unresolved until acceptance                               |
| Cast or Event staff invitation awaits response                      | Personal commitment                                                      | Recipient                                                        | Accept or decline                                                                                             |
| Candidate Slot awaits a required Availability Response              | Personal commitment                                                      | Called participant                                               | Respond available, unavailable, or uncertain                                                                  |
| Counteroffer awaits Producer response                               | Personal commitment; expiring state may also be an Operational Exception | Producer; Theater Operators may monitor                          | Accept or decline before expiry                                                                               |
| Counteroffer or temporary hold approaches expiry                    | Operational Exception                                                    | Relevant Producer, Reviewer, and Theater Operators as authorized | Monitor or take an available domain action; do not present a false Operator decision                          |
| Admin Invitation awaits response                                    | Personal commitment                                                      | Invited Member                                                   | Accept or decline Admin authority                                                                             |
| Ownership transfer awaits response                                  | Personal commitment                                                      | Proposed successor; current Owner retains authority              | Accept or decline transfer                                                                                    |
| Resource is occupied but Event details are unauthorized             | Opaque Calendar entry                                                    | Active Theater Members                                           | Show time and resource only; provide no private Event or blocker link                                         |
| Final Confirmed Slot has ended                                      | Automatic lifecycle transition                                           | System, with Operator visibility                                 | Complete the Event automatically; raise an Operational Exception only if safe completion fails                |
| Published Event is cancelled before its final scheduled Performance | Public cancellation state                                                | Public visitors                                                  | Keep it discoverable and clearly cancelled until the final scheduled Performance passes                       |

## User Stories

1. As an authenticated person, I want to land on my Callsheet, so that I can understand what needs my attention before choosing a Theater or role.
2. As a person who belongs to multiple Theaters, I want one cross-Theater Callsheet, so that my work is not fragmented by organization.
3. As a person with several relationships, I want Stagecom to combine my authorized work without a role switcher, so that I do not need to decide which hat I am wearing.
4. As a person with several relationships, I want every action labeled by Theater, Event, and relationship, so that I understand why it is relevant to me.
5. As an authenticated person, I want my personal commitments separated from shared Theater work, so that shared authority does not masquerade as personal assignment.
6. As an authenticated person, I want upcoming Calls and commitments summarized on my Callsheet, so that I can prepare for what happens next.
7. As an authenticated person, I want a dedicated personal Calendar, so that I can inspect my schedule beyond the Callsheet summary.
8. As an authenticated person, I want my personal Calendar to omit unrelated opaque Theater occupancy, so that it remains genuinely personal.
9. As an authenticated person, I want stable navigation destinations, so that gaining or losing a role does not make Stagecom feel like a different application.
10. As an authenticated person, I want unavailable administrative destinations omitted, so that navigation does not lead me into permission errors.
11. As an authenticated person, I want meaningful read-only destinations retained when I have view access, so that permission shaping does not unnecessarily hide useful Theater information.
12. As an authenticated person, I want loading, empty, forbidden, not-found, and unexpected-error states to explain what I can do next, so that I do not reach dead ends.
13. As a Theater Operator, I want a Theater Operations cockpit, so that I can identify decisions, risks, and schedule pressure within roughly 30 seconds.
14. As a Theater Operator, I want the Work Queue to contain only actions I can take, so that “needs attention” remains trustworthy.
15. As a Theater Operator, I want Work Queue items ordered by explainable urgency and operational impact, so that overdue and At Risk work precedes routine decisions.
16. As a Theater Operator, I want urgency reasons such as an approaching expiry shown explicitly, so that priority does not feel arbitrary.
17. As a Theater Operator, I want watch-only Operational Exceptions separated from decisions, so that awareness does not create false work.
18. As a Theater Operator, I want the upcoming Theater Calendar summarized beside operational work, so that decisions have schedule context.
19. As a Theater Operator, I want an Event pipeline summary, so that I can understand current drafts, reviews, upcoming Events, Publication, and health.
20. As a Theater Operator, I want recent activity summarized without replacing the Work Queue, so that I can inspect what changed after addressing current work.
21. As a Theater Operator, I want Proposal Revisions awaiting my eligible review in the Work Queue, so that review work is discoverable without browsing every Event.
22. As a Theater Operator, I want At Risk Events in the Work Queue, so that management intervention is not hidden inside Event detail.
23. As a Theater Operator, I want cancellation requests in the Work Queue, so that Producers receive a clear management decision.
24. As a Theater Operator, I want Theater and Event Publication decisions to appear only when the exact snapshot is eligible, so that every queue item can be completed.
25. As a Theater Operator, I want incomplete Producer-owned public content shown as an exception rather than a Publication action, so that responsibility remains truthful.
26. As a Theater Operator, I want unfilled required staff needs in the Work Queue, so that approved operations do not silently remain understaffed.
27. As a Theater Operator, I want an Event list sortable and filterable by dates, leadership, lifecycle, Proposal state, Publication, health, and next action, so that independent states are not collapsed into a misleading Kanban column.
28. As a Theater Operator, I want saved Event views such as Needs Attention, Upcoming, Draft/Review, and Published, so that common portfolio questions are quick to answer.
29. As a Theater Operator, I want every management control located with its underlying Event, person, or policy, so that the cockpit remains concise.
30. As an Owner, I want the same operational workspace as Admins, so that Stagecom does not create two separate management products.
31. As an Owner, I want Owner-only sovereignty actions separated from ordinary operations, so that final authority is explicit.
32. As an Owner, I want to invite an active Theater Member to become an Admin, so that operational authority can be delegated.
33. As an Owner, I want Admin authority to begin only after acceptance, so that privileged responsibility is consensual.
34. As an Owner, I want to revoke any Admin immediately, so that I retain a reliable recovery path.
35. As an Owner, I want to propose an ownership transfer to an active Theater Member, so that accountability can pass deliberately.
36. As an Owner, I want to remain Owner until the recipient accepts, so that the Theater is never left without final authority.
37. As an Owner, I want the transfer to choose whether I become an Admin or Member, defaulting to Admin, so that continuity and departure are both supported.
38. As an Owner, I want a configured and separately audited self-approval override, so that a one-person Theater can proceed without making self-review ordinary.
39. As an Admin, I want to invite or remove peer Admins without changing Owner authority, so that administration is easy to scale while final accountability remains protected.
40. As an Admin, I want to remove myself as Admin, so that I can relinquish authority without ending Theater membership.
41. As a Theater Operator, I want every Admin grant, removal, and ownership transfer recorded in Theater history, so that governance changes remain factual and auditable.
42. As a Theater Member, I want a People directory of active Members, so that membership feels like belonging to a community.
43. As a Theater Member, I want to see who is Owner or Admin, so that I know whom to approach about Theater-wide concerns.
44. As a Theater Member, I want private contact details, narrow capabilities, and access history withheld, so that the directory respects privacy.
45. As a Theater Operator, I want People divided into Directory, Invitations, Access & Roles, and Former Members, so that relationship management is understandable.
46. As a Theater Operator, I want to inspect Former Theater Members separately from the active directory, so that current access is clear without erasing history.
47. As a Theater Operator, I want targeted membership invitations and Reusable Join Links managed under People, so that admission is not mixed with Theater policy.
48. As a Theater Operator, I want Proposer and Reviewer capabilities managed under People, so that narrow authority remains distinct from Admin authority.
49. As a Theater Operator, I want Theater Settings divided into Public Presence, Event Policy, Venue & Calendar, and Ownership & Security, so that durable policy is not one long form.
50. As an Admin, I want access to ordinary Theater configuration but not Owner-only Ownership & Security actions, so that delegation does not erase sovereignty.
51. As a Theater Member, I want to discover published Events and Events in which I have a relationship, so that I can find relevant programming without seeing private drafts.
52. As a Theater Member, I want unrelated private Events represented only as opaque venue occupancy, so that tentative programming and private logistics remain protected.
53. As a Theater Member, I want a Theater Calendar containing all committed Primary Venue occupancy, so that I can understand when the shared resource is unavailable.
54. As an uninvolved Theater Member, I want an unauthorized occupied interval to show only time and “Primary Venue unavailable,” so that I can plan without learning private details.
55. As an involved Event participant, I want Calendar entries to expose the Event and Occurrence details I am authorized to see, so that the Calendar becomes a useful path into my work.
56. As a Theater Operator, I want a week/resource Calendar by default, so that I can see venue utilization and gaps.
57. As a Theater Member, I want list and month alternatives on the Theater Calendar, so that I can choose a useful temporal view.
58. As an individual, I want my personal Calendar to default to agenda/upcoming, so that my next commitments are prominent.
59. As a Theater Operator, I want to create a Schedule Block for the Primary Venue, so that maintenance, rentals, and unmodeled activity can reserve time without pretending to be Events.
60. As a Theater Operator, I want a Schedule Block to record start, end, resource, a private label, optional private notes, creator, and history, so that its operational purpose is clear to authorized people.
61. As a Theater Member, I want an unauthorized Schedule Block to remain opaque, so that private labels and creator identity are not disclosed.
62. As a Theater Operator, I want Schedule Blocks, active temporary holds, and approved Primary Venue commitments to reject overlaps, so that the Calendar remains trustworthy.
63. As an Owner, I do not want a privileged double-booking override, so that sovereignty cannot silently corrupt resource truth.
64. As a Theater Operator, I want to move or release an existing commitment explicitly before using its time, so that schedule history remains accurate.
65. As an authorized Event collaborator, I want every Event to open on Overview, so that the entrance remains predictable across relationships.
66. As an authorized Event collaborator, I want Overview to show lifecycle, Proposal decision, Publication, and operational health independently, so that one status does not hide important state.
67. As an authorized Event collaborator, I want Overview to identify all my Event relationships, so that available actions have context.
68. As an authorized Event collaborator, I want one highest-priority next action followed by secondary actions, so that multi-role access does not create a wall of equally weighted controls.
69. As an authorized Event collaborator, I want actions labeled by relationship, so that I know whether I am acting as Producer, Cast Member, Reviewer, staff, or Theater Operator.
70. As an authorized Event collaborator, I want Overview to summarize the next Occurrence, leadership, participation, staff coverage, viability risk, and public status, so that I can orient without scanning every section.
71. As an authorized Event collaborator, I want stable Event sections for Overview, Schedule & Plan, Cast & Team, Review, Public Page, and History, so that the workspace is learnable.
72. As an authorized Event collaborator, I want inaccessible sections omitted when they contain no information I may see, so that stable structure does not create empty permission traps.
73. As a Producer, I want Schedule & Plan to contain Occurrences, Candidate Slots, confirmed choices, resources, visibility, and viability, so that operational planning remains cohesive.
74. As a Producer, I want requested staffing needs represented separately from named assignments, so that “we need two front-of-house people” is not confused with actual commitments.
75. As a Director, I want Cast & Team to contain Cast invitations, participation, Availability Responses, and Occurrence Calls, so that participation work is in one place.
76. As a Theater Operator, I want to invite an active Theater Member to a named Event Staff Assignment, so that a requested staff need can be resolved inside Stagecom.
77. As an invited Event staff member, I want to accept or decline the assignment, so that Theater membership does not imply consent to work.
78. As a Theater Operator, I want a staff need to remain unresolved until enough invitees accept, so that pending invitations are not mistaken for coverage.
79. As an accepted Event staff member, I want an Event responsibility plus Calls for selected Occurrences, so that I am not assumed to attend every Rehearsal and Performance.
80. As an accepted Event staff member, I want access to the Event summary, assigned Occurrences, my responsibility, my Calls, and necessary logistics, so that I can do the job without seeing unrelated private material.
81. As a Producer or Director, I want staffing needs in Schedule & Plan linked to named assignments in Cast & Team, so that need and fulfillment remain connected.
82. As a Reviewer, I want Review to show the immutable Proposal Revision and available decisions, so that I know exactly what I am deciding.
83. As a Reviewer who authored the Proposal Revision, I want Stagecom to explain that another Reviewer is required, so that blocked work is visible rather than disappearing.
84. As an eligible Owner-author, I want the audited override presented as a separate exceptional action, so that ordinary review rules remain clear.
85. As a Producer, I want requested edits and Counteroffers to appear in my personal commitments and Event Overview, so that the next step is discoverable.
86. As a Producer, I want public content readiness and blockers in Public Page, so that I can prepare the exact snapshot management will consider.
87. As a Theater Operator, I want Publication to remain separate from Operational Approval, so that schedule acceptance does not silently change the public site.
88. As a Theater Operator, I want to preview the exact eligible public snapshot before Publication, so that the public result is deliberate.
89. As a public visitor, I want published upcoming Events listed chronologically on the Theater page, so that I can discover what is happening without a direct link.
90. As a public visitor, I want an Event card to show its image when available, title, next public Performance, location, admission summary, and cancellation state, so that I can scan programming quickly.
91. As a public visitor, I want a cancelled published Event to remain discoverable until its final scheduled Performance passes, so that I do not arrive expecting a Performance.
92. As a public visitor, I want the Event card to lead to the canonical published Event page, so that complete public information remains in one place.
93. As a Cast Member, I want invitations, Availability Responses, Counteroffers relevant to my participation, and upcoming Calls surfaced without direct URLs, so that I can complete my obligations from Stagecom navigation.
94. As a multi-role person, I want a review action and a Cast response for the same Event represented separately and prioritized honestly, so that one relationship does not hide another.
95. As a Notification recipient, I want to mark an alert read or dismiss it for myself, so that I can control attention without changing Theater reality.
96. As another authorized person, I want shared work to remain visible after someone else dismisses a Notification, so that operational work cannot be lost through personal alert state.
97. As a design reviewer, I want an actor/job/state/next-action matrix before production implementation, so that no actor or state combination is silently omitted.
98. As a design reviewer, I want an interactive seeded prototype spanning Owner, Admin, Producer, Director, Cast Member, Reviewer, Event staff, Member, and public visitor scenarios, so that consistency and disclosure can be evaluated before costly restructuring.
99. As a prototype participant, I want to start from Callsheet or the public Theater page rather than a supplied deep link, so that the prototype tests discoverability.
100. As a product maintainer, I want prototype participants to locate highest-priority work within roughly 30 seconds, so that the new IA proves its central promise.
101. As a product maintainer, I want prototype findings documented before dependent implementation begins, so that tickets can reflect validated behavior.
102. As a product maintainer, I want the existing brand direction and design tokens preserved during structural redesign, so that workflow validation is not conflated with a visual rebrand.
103. As a mobile user, I want Callsheet, personal Calendar, invitations, and responses optimized for phone use, so that time-sensitive participation work is practical.
104. As a Theater Operator, I want Theater Operations and planning optimized for desktop density while remaining fully functional on mobile, so that operational depth does not exclude smaller screens.
105. As a maintainer, I want the capability milestone described honestly as acceptance-proven but end-user discoverability incomplete, so that documentation reflects both achievement and remaining work.

## Implementation Decisions

### Product And Terminology

- The initial operating model is a small-to-medium Theater with one active Owner, zero or more Admins, and people who commonly hold multiple Theater and Event relationships.
- The core Operator promise is: show what needs attention, explain why, and help the Operator unblock the Theater.
- User-facing records remain **Events**, never Shows. “Planner” does not become a domain role; planning authority continues to arise from Producer, Director, or Theater Operator relationships.
- Callsheet is personal and cross-Theater. Theater Operations is Theater-scoped and Operator-wide. “Theater Callsheet” is not used.
- The current milestone is described as a capability path that is implemented and acceptance-proven while the end-user journey and discoverability remain incomplete.

### Application Shell And Navigation

- Every authenticated person lands on Callsheet even when they have a default Theater.
- Entering a Theater is an explicit scope change, supported by a clear Theater switcher.
- Stable authenticated destinations are Callsheet, personal Calendar, Theater Operations, Theater Calendar, Events, and People when meaningful to the viewer.
- Settings and other Operator-only destinations appear only to Theater Operators.
- The shell does not expose role modes. Read models combine all current relationships and actions for the signed-in person.
- Unauthorized actions are hidden when the destination has no meaningful content. Meaningful read-only views remain accessible and explain why an action is unavailable when that explanation helps the person.
- Established users do not retain Onboarding as a primary navigation destination.

### Callsheet, Work Queue, Exceptions, Notifications, And Activity

- Callsheet separates **Your commitments** from **Theater needs attention**.
- Personal commitments initially include Cast and staff invitations, Availability Responses, Counteroffer responses, requested Proposal edits, upcoming Calls, Admin Invitations, and ownership-transfer responses.
- The Theater Operator Work Queue initially includes eligible Proposal review, At Risk decisions, cancellation requests, ready-to-publish Theater/Event snapshots, and required Event staff needs awaiting accepted coverage.
- Work Queue entries are projections of unresolved domain state rather than manually created or manually closed tasks.
- The initial product has no manual task assignment or operator-maintained priority field.
- Priority is deterministic and explainable: overdue and At Risk work precedes expiring decisions, which precede ordinary review and Publication readiness.
- Operational Exceptions include important watch-only conditions such as approaching expiry, blocked progress owned by another relationship, and safe automatic transitions that failed.
- Notifications retain per-recipient read and dismissed state. These fields do not affect Work Queue or Operational Exception projections.
- Notification and activity read surfaces are added over the existing domain-event-derived records. UI code does not create Notifications directly.
- Callsheet and Theater Operations receive dedicated read models that aggregate only the data necessary for their scope rather than assembling behavior in route files.

### Theater Operations And Event Portfolio

- Theater Operations is a concise cockpit rather than a page containing every management control.
- Its order is Work Queue, urgent Operational Exceptions, upcoming Theater Calendar, Event pipeline, and recent activity.
- The Event portfolio is a sortable/filterable list, not a single-state Kanban board.
- Event summaries include dates, leadership, independent state badges, operational health, and the next action available to the viewer.
- Initial saved views are Needs Attention, Upcoming, Draft/Review, and Published.

### Event Workspace

- Every authorized Event viewer enters through Overview unless following a deep link to a specific action.
- Stable sections are Overview, Schedule & Plan, Cast & Team, Review, Public Page, and History.
- Overview receives a relationship-aware read model with independent Event states, viewer relationships, primary and secondary actions, next Occurrence, leadership/participation/staff coverage, viability risk, and public status.
- Primary-action selection is deterministic. Secondary actions remain visible and are labeled by the relationship granting them.
- Schedule & Plan owns Occurrences, Candidate Slots, confirmed choices, visibility, resources, Minimum Viable Cast, and requested staffing needs.
- Cast & Team owns leadership, Cast invitations and participation, Availability Responses, Proposed Cast, Event Staff Assignments, and Occurrence Calls.
- Review owns immutable Proposal Revisions, decisions, Counteroffers, authorship restrictions, and the Owner override.
- Public Page owns public-content drafting, admission, credits, exact preview, Publication readiness, and Publication.
- History owns factual Event activity and preserved decisions.
- The implementation replaces the current single-scroll composition incrementally while preserving existing command and authorization behavior.

### Calendar And Scheduling

- A shared calendar occupancy read model combines Confirmed Slots, active exclusive temporary holds, and Schedule Blocks.
- Candidate Slots do not occupy the Primary Venue unless a domain workflow has created an exclusive hold or commitment.
- The initial exclusive resource remains the Primary Venue. Interfaces and copy remain resource-aware so multiple rooms or venues can be added later without redefining Calendar language.
- Personal Calendar defaults to agenda/upcoming and includes only entries involving the person.
- Theater Calendar defaults to a week/resource grid and also offers list and month views.
- Theater Operators see all operational details. Involved people see relationship-authorized details. Other active Members see time and resource only. Public visitors see only published public Occurrences.
- Opaque entries are not clickable paths to unauthorized Events and do not expose Event title, private label, notes, or creator identity.
- Only Theater Operators may create, modify, release, or cancel explicit Schedule Blocks.
- A Schedule Block records resource, start, end, private label, optional private notes, creator, and factual change history.
- Schedule Blocks do not recur in the first version.
- Confirmed Primary Venue commitments, active exclusive holds, and Schedule Blocks share one non-overlap guarantee including existing setup and turnover buffers where applicable.
- No Owner or Admin override may silently create a conflict. An existing commitment must be moved or released through its own domain action.

### Ownership, Administration, And People

- The data model and authorization boundary enforce exactly one active Owner per Theater.
- Owner and Admin are separate relationships that independently confer Theater Operator authority.
- The Owner is not represented as a protected Admin row.
- Owner and Admin may create an Admin Invitation for an active Theater Member.
- Admin authority begins only after recipient acceptance. Decline or revocation leaves base Theater membership unchanged.
- Owner may remove any Admin. An Admin may remove themself or another Admin. Nobody may remove or demote the Owner through Admin management.
- Revocation takes effect immediately for future private reads and mutations and is recorded as Theater history.
- Ownership transfer is offered only to an active Theater Member and requires explicit recipient acceptance.
- The existing Owner retains authority until acceptance commits the transfer.
- An accepted transfer atomically establishes the new Owner and changes the former Owner to the explicitly chosen Admin or Member role, defaulting to Admin.
- People is organized as Directory, Invitations, Access & Roles, and Former Members.
- Active Members see Directory with display names and Owner/Admin badges only.
- Operators additionally see membership roles, narrow capabilities, invitation/access state, and factual history.
- Former Theater Members are excluded from the active directory and available to Operators through a separate historical view.
- Targeted Invitations, Reusable Join Links, Admin Invitations, Proposer/Reviewer capabilities, deactivation, and future reactivation belong to People rather than general Settings.
- Settings is divided into Public Presence, Event Policy, Venue & Calendar, and Ownership & Security. Ownership & Security is Owner-only.

### Event Staff Assignments

- Event staff is an explicit relationship, not merely a requested resource label.
- A staffing request describes needed quantity and responsibility. A named Event Staff Assignment identifies an invited Theater Member and responsibility.
- Operator invitation creates a pending assignment. The Member must accept before the assignment counts toward coverage.
- Decline or revocation returns the need to unresolved state as appropriate.
- An accepted assignment belongs to the Event and may receive required, optional, or not-called participation for selected Occurrences.
- Accepted Event staff receive only the Event summary, assigned Occurrences, their responsibility, Calls, and necessary logistics unless another relationship grants broader access.
- Staff assignment, acceptance, decline, revocation, and Calls produce factual domain events; Notifications are projected from those events.

### Review, Publication, Completion, And Public Discovery

- A self-authored Proposal remains visible to its author with an explanation that another Reviewer is required.
- Only an eligible Owner sees the configured self-approval override, and the action remains separate, reasoned, and audited.
- Publication enters the Operator Work Queue only when the exact Theater or Event snapshot can be previewed and published.
- Producer-owned missing public content is a Producer commitment and an Operator-visible Operational Exception, not a premature Publication decision.
- Operational Approval and Publication remain separate.
- An approved Event completes automatically after its last Confirmed Slot ends. Failure to complete safely produces an Operator-visible exception rather than a routine manual completion task.
- The public Theater query includes upcoming published Event cards ordered by the next public Performance.
- Event cards contain image when available, title, next public Performance date/time and location, admission summary, and cancellation state.
- A cancelled published Event remains listed and clearly marked until its final scheduled Performance passes. A past-Events archive is deferred.
- Public Theater and Event reads remain separate allowlisted anonymous-safe queries.

### Design And Responsive Behavior

- Existing fonts, source colors, tokens, public playbill direction, and calm authenticated direction are retained.
- The prototype and implementation redesign information architecture, page hierarchy, component composition, action priority, disclosure, and interaction states before broader visual polish.
- Callsheet, personal Calendar, invitations, and responses are mobile-first.
- Theater Operations, planning, review, and resource scheduling are desktop-optimized but fully functional on mobile.
- State is never communicated by color alone. Keyboard navigation, semantic labels, focus management, and accessible loading/error feedback are required.
- Reusable components preserve interaction consistency across roles without forcing every role into identical page content.

### Prototype And Validation

- Before dependent production restructuring begins, create the complete actor/job/state/next-action matrix represented by this spec and a throwaway interactive prototype.
- The prototype uses seeded Owner, Admin, Producer, Director, Cast Member, Reviewer, Event staff, base Member, multi-role, and public visitor scenarios.
- Required prototype scenarios are: Operator review/Publication/cancellation/At Risk work; Admin operations/staffing/Calendar/Admin access; multi-role transitions; base-Member Calendar and People disclosure; ownership transfer; and public discovery including cancellation.
- Participants begin from Callsheet or the public Theater page and navigate using visible affordances. Direct protected URLs and coaching are not allowed during validation.
- Graduation evidence is: highest-priority work found within roughly 30 seconds; correct navigation from Callsheet or Theater Operations; correct distinction among personal commitments, shared Work Queue, Operational Exceptions, and Notifications; correct understanding of Calendar detail versus opaque occupancy; and no unauthorized dead ends.
- Run internal scenario walkthroughs first, then validate with several real Theater Operators or close proxies.
- Capture findings in an exploratory operational-workspaces wiki page. Validated behavior updates this spec before dependent implementation tickets proceed.
- The comprehensive ticket graph may be drafted from this spec, but prototype and validation tickets block production tickets whose boundaries or interactions depend on their findings.

### Architectural Boundaries

- Route files and server functions remain thin. Product behavior belongs in feature commands, queries, and dedicated read-model modules.
- Private reads and every mutation perform explicit application-level authorization before privileged persistence.
- Service-role database access remains server-only after authorization.
- Inputs are validated and failures use the existing typed application-error contract.
- Notifications continue to originate from explicit domain events, never from UI components.
- New projections favor a small number of deep read-model interfaces: personal Callsheet, Theater Operations, Calendar occupancy, Event Overview, People/access, and public Event discovery.
- Existing commands and transactional invariants are reused where they already express accepted behavior.
- Schema work will be required for single-Owner enforcement, pending Admin Invitations, accepted ownership transfers, Schedule Blocks, Event Staff Assignment response/call state where existing storage is insufficient, and personal Notification state where absent.
- Every new mutation is optimistic/idempotent where retries or concurrent decisions are plausible and records factual Theater or Event history.
- Local Supabase is the default implementation and verification target. Remote migrations, seeding, and production changes remain separately approved operations.

## Testing Decisions

- Tests assert externally observable behavior and durable domain invariants rather than component structure, internal hook use, or query implementation details.
- The highest acceptance seam is one seeded Playwright operational-workspace journey. Every persona begins from Callsheet or the public Theater page and navigates through visible UI rather than direct protected URLs.
- That journey covers role-aware navigation, personal and shared work, Event Overview and sections, Calendar detail/redaction, People/access, Admin acceptance, ownership transfer, Event staff assignment, and public Event discovery.
- Existing Event-publication acceptance coverage is prior art for the multi-person journey, but the new seam specifically proves discoverability that direct-route navigation did not prove.
- Focused Playwright scenarios retain alternate outcomes and disclosure boundaries that would make the primary journey unreadable, including declined invitations, self-authored review, opaque Calendar blocks, revoked Admin access, cancelled public Events, and responsive mobile paths.
- Local database tests own concurrency and transactional invariants: exactly one Owner, accepted transfer, Admin acceptance/revocation, immediate authorization loss, Schedule Block and existing commitment exclusivity, Event staff acceptance/coverage, idempotent retries, and domain-event deduplication.
- Existing governance, Proposal Revision, cancellation, and local database acceptance suites are prior art for transaction-level authorization, optimistic versioning, and retry behavior.
- Pure read-model unit tests own deterministic Work Queue priority, Operational Exception classification, primary/secondary next-action selection, Calendar projection and redaction, Event portfolio saved views, and relationship-based Event Overview disclosure.
- Existing Proposal-preparation read-model tests are prior art for testing ordered, role-sensitive projections without coupling to UI implementation.
- Component tests cover interaction behavior only where a component owns meaningful local state, such as switching Calendar views or displaying primary versus secondary actions. They do not duplicate server authorization tests.
- Accessibility checks cover keyboard reachability, visible focus, semantic names, headings, dialog focus management, non-color state communication, and responsive reflow.
- Prototype validation is human behavioral evidence, not an automated test substitute. Findings must be recorded and reconciled with this spec before dependent implementation begins.
- Standard verification is type checking, unit/integration tests, end-to-end tests, and production build. Schema tickets additionally run local migration, database, and generated-type checks.

## Out Of Scope

- A broad visual rebrand, replacement design system, or dark mode.
- Explicit role-switching modes or separate applications for Owner, Admin, Producer, Director, Reviewer, Cast, or staff.
- A new Planner role.
- Generic Activities, workshops, Practices, auditions, meetings, registrations, or workshop signup.
- Multiple modeled rooms, stages, venues, or other schedulable resources beyond the Primary Venue.
- Recurring Schedule Blocks or recurring Event series.
- External calendar subscription/export and one-way or two-way Google, Apple, or Outlook synchronization.
- Manual Operator task creation, assignment, prioritization, or a general project-management system.
- Rich Member profiles, biographies, skills directories, or default sharing of Member contact information.
- Public disclosure of private Event titles, Schedule Block labels, notes, creators, Candidate Slots, or internal operational state.
- Privileged double-booking overrides.
- A public archive of past Events.
- Native Stagecom ticket sales, audience analytics, committee review, automated application email/SMS, guest Cast, open casting calls, or Producer reliability scores.
- Remote database migrations, remote seeding, production changes, merges, or releases as part of specification or ticket generation.

## Further Notes

- This is one comprehensive product spec. Ticket generation must include the design matrix, prototype, validation, documentation reconciliation, enabling domain capabilities, and production experience rather than treating the prototype as a separate feature spec.
- Prototype and validation tickets should block production tickets whose interaction boundaries depend on their results. Tickets for clearly independent domain foundations may proceed only when their behavior is already fixed by this spec and their interfaces do not pre-empt prototype findings.
- The governance model follows the accepted decision “Single transferable Theater Owner.” The work model follows the accepted decision “Separate shared work from personal alerts.”
- The canonical glossary includes Theater Operator, Callsheet, Theater Operations, Work Queue, Operational Exception, Notification, Theater Calendar, Schedule Block, Admin Invitation, Former Theater Member, and Event Staff Assignment.
- The current Event-publication capability path remains valuable prior art. This milestone is not a backend rewrite; it reorganizes and deepens the product around existing commands and fills the specific seams required for a coherent operating experience.
- The accepted specification is published in Linear as STA-25; this file is its repository mirror.
- The approved tracer-bullet tickets and native blocking relationships are recorded under STA-25 in Linear.
