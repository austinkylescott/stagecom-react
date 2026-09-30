# Member Home direction

Documentation status: active

Implementation status: Exploratory — selected prototype direction; production implementation pending.

## STA-64 review decision

Subsequent redesign brief: the [visual playground brief](../../docs/design/visual-playground-brief.md)
now explores a Theater-owned portal with context-preserving sign-in and a
secondary personal Callsheet destination. For that exploration, it supersedes
the rule below that Home always means Callsheet. The personal-priority lessons
and single-Theater emphasis remain relevant. This does not change production
navigation or erase the original prototype review record.

On September 29, 2026, the reviewer selected **A — Priorities then discovery** from the Member journey prototype. The personal Home presents:

- A dedicated area for responses the person needs to give.
- Their upcoming commitments.
- Their Theater, or Theaters, alongside the personal work.
- Published Event discovery below.

Home always means the person's Callsheet. Theater landing pages use the actual Theater name in navigation, rather than a competing “Theater home” label. Calendar, Events, and People are visibly scoped to that Theater.

Prioritize the one-Theater case. Multiple memberships remain supported, but should not drive the common layout. This reflects reviewer guidance, not measured membership statistics.

B (Daybook) was rejected because the resulting timeline design did not work. C (Theater portal) was rejected because it felt more cramped than A. Both remain available in the throwaway prototype for comparison.

## Evidence and limits

See [the STA-64 prototype and review record](../../src/features/member-journey-prototype/README.md). This decision selects the Home structure and navigation language. It does not validate every destination, specify avatar-based casting, or authorize shipping the prototype as production code.

## Visual playground first review — September 30, 2026

The redesigned Callsheet should keep required actions in a list, remove completed
responses, and place confirmed Calls in an adjacent timeline. The preferred
sidebar order starts with Callsheet, then Calendar, Theater and People; this is
navigation ordering, not a decision to change the active Theater entry rule.
Mobile uses a drawer, with notification/account controls in the header.
See [review round 1](../../docs/design/visual-playground-review-round-1.md).

## Availability and Teams workshop

See [round 2](../../docs/design/visual-workshop-round-2.md) and the
[draft skeleton specification](../../docs/specs/theater-workspace-skeleton-draft.md).
Members can manage Teams without ordinary Operator intervention. The sole
remaining Member becomes Team Owner. Availability Responses remain editable
until poll closure. Other scope, consent and workflow policies are proposals
in the draft, not approved implementation behavior.
