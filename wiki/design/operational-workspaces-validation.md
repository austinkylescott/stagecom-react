# Operational Workspaces Validation

Status: Exploratory

This page records validation evidence for the throwaway operational-workspaces
prototype. It is intentionally separate from the product contract: an observed
result can motivate a specification change, but does not itself commit the
product to that change.

## Prototype under review

The reviewed prototype is available at
`/dev/operational-workspaces-prototype`. Its URL records the seeded scenario,
starting surface, and viewport, allowing later sessions to link to the exact
state they discussed.

## Internal walkthrough feedback

Date: 2026-08-19

Evidence: maintainer feedback after an internal prototype walkthrough. No
timed session log, participant-by-participant path record, or detailed notes
were captured.

| Area                      | Observed result                                                                                                                             | Confidence                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Overall interaction model | The prototype is a good basis for the interactions Theater Operators need to manage.                                                        | Directional only; this is one internal assessment. |
| Presentation              | The current presentation still needs a deliberate design pass. This is acceptable for a prototype and is not a blocking interaction defect. | Directional only.                                  |
| Calendar planning         | A month view is not represented.                                                                                                            | Confirmed gap in the current prototype.            |
| Cast invitations          | The prototype does not establish what the cast-invite experience should be.                                                                 | Confirmed gap in the current prototype.            |

No blocking prototype defect was identified in this walkthrough. The feedback
does not establish whether an uncoached participant can find priority work
within roughly 30 seconds, distinguish every work classification, understand
Calendar disclosure, or recover from unauthorized destinations.

## Uncoached-session evidence

No external Theater Operator or close-proxy sessions have been recorded yet.
Consequently, this page contains no session durations, chosen navigation paths,
classification misunderstandings, unauthorized dead ends, or disclosure-
comprehension outcomes. Those observations must be collected before the
prototype can graduate from exploratory validation.

Use only a Callsheet or public Theater starting surface. Do not supply a
protected URL or navigation coaching. For each participant, record:

- time to locate their highest-priority work;
- navigation path and any backtracking;
- how they classify a personal commitment, shared Work Queue item,
  Operational Exception, and Notification;
- their understanding of detailed versus opaque Calendar occupancy; and
- any unauthorized destination or dead end, including how they recover.

## Findings and reconciliation

STA-29 reconciled every material finding into the accepted product contract:

| Finding                                                        | STA-29 resolution                                                                                                                                                                                                             |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The interaction model is a good basis for Operator management. | Accepted; retain the model without a blocking interaction correction.                                                                                                                                                         |
| The presentation needs a deliberate design pass.               | Documented post-validation follow-up outside this milestone; it is not a reason to rebrand or delay the contract.                                                                                                             |
| A month view is not represented.                               | Accepted change; add the desktop-first Operator month-planning scenario and preserve Calendar disclosure on its phone fallback.                                                                                               |
| Cast invitation behavior is not established.                   | Accepted change; use the phone-first Callsheet scenario that states the deciding information, explicit response, and pre-acceptance redaction.                                                                                |
| No uncoached sessions are recorded.                            | Accepted planning change and documented follow-up outside this milestone: internal validation plus STA-29 opens the first implementation frontier, while sessions remain required before claiming discoverability graduation. |

The accepted details now live in the operational-workspaces specification and
actor/state matrix. This page remains an evidence record rather than a second
product contract.

## Open questions

- Can uncoached Operators identify the highest-priority work from Callsheet or
  a public Theater page within roughly 30 seconds?
- Do participants understand why an action applies to them and distinguish
  shared work from personal alerts without explanation?
- Do unauthorized routes create recoverable, comprehensible outcomes?

## Next evidence needed

Run several uncoached sessions with real Theater Operators or close proxies,
then update this page with anonymized per-session observations and any
resulting prototype changes. Any newly validated behavior must be reconciled
through the operational-workspaces specification and actor/state matrix.
