# Theater workspace — independent review handoff

Date: September 30, 2026. Review specification before creating Linear issues.

## Start here

Read [the consolidated specification](theater-workspace-skeleton-draft.md).
It separates confirmed maintainer direction from proposed production policies,
provides a decision register (R1–R14), reconciles earlier contracts, and suggests
delivery slices. The maintainer accepted the workshop direction but requested
independent review before issue creation. No fresh shadcn workspace has been
built. This handoff requests review, not implementation or ticket creation.

## Review task for the next agent

Review the specification against the source evidence and existing domain rules.
Identify contradictions, missing behaviors, authorization gaps and ambiguous
acceptance criteria. For each R1–R14 decision, recommend accept, revise or defer
with a brief reason. Preserve explicitly confirmed decisions rather than
reopening them by default. Ask the maintainer only about consequential unresolved
choices; do not treat a prototype assumption as their decision.

Return a prioritized findings list, proposed exact spec edits and a list of
decisions still needed before issue creation. Reconcile entry routing, calendar
defaults, Team succession/consent/lifecycle, poll audience/privacy/revision,
and stale/concurrent writes. Check proposed issue boundaries against existing
coverage before recommending new issues. Do not create issues, implement code,
commit, publish or modify remote systems as part of this review.

## Confirmed decisions to preserve

- Use neutral, actual shadcn components first; refine page structure and behavior,
  then branding. A's desktop sidebar is the structural starting point.
- Navigation order: Callsheet, Calendar, Theater, People; mobile drawer/sheet.
  Callsheet remains personal and cross-Theater.
- Callsheet actions clear after responses; confirmed schedule has its own column.
- Desktop notification/account controls are at sidebar bottom; phone controls
  are top right. Notifications open a pane and do not resolve domain work.
- Availability is a multi-option scheduling poll; submitted responses can be
  revised until closure. Choosing a candidate is not a confirmed booking.
- One Event identity/workspace contains typed Occurrences shown chronologically;
  Calendar activation selects an Occurrence within that Event. Public/private
  disclosure remains relationship-dependent.
- Directory supports overlapping Teams and avatar-based recognition. Casting
  allows a whole Team or subset, expanding into individual invitations.
- Theater Members create/manage Teams without routine management intervention.
  The sole remaining Member owns the Team; a departing Owner chooses a successor
  when several Members remain. Operator recovery may exist as a fallback.

Poster dimensions, calendar library, new visibility modes, final branding and
the detailed new backend policies are not all locked. Preserve full poster
content in the skeleton using the existing 4:5 format.

## Sources and precedence

1. [First human review](../design/visual-playground-review-round-1.md) and
   [Availability/Teams workshop](../design/visual-workshop-round-2.md): captured
   maintainer decisions and explicitly labelled fixture assumptions.
2. [Visual playground brief](../design/visual-playground-brief.md): exploration
   scope, Theater-context entry and evidence limitations.
3. [Existing operational-workspaces spec](operational-workspaces.md),
   [domain glossary](../../CONTEXT.md), [ADRs](../adr/), and
   [coding rules](../development/coding-rules.md): existing domain and engineering
   contracts. Read the new specification's reconciliation table before choosing
   between older production defaults and the newer exploration direction.
4. [Delivery workflow](../agents/delivery-workflow.md): Linear and approval
   boundaries. Proposed issue slices are not authorization to create issues.

## Runnable evidence

Prototype worktree:
`/Users/akscott/orca/workspaces/stagecom-react/visual-playground`

Branch: `prototype/visual-playground`. The evidence includes uncommitted files;
checking out the branch alone will not reproduce the artifact. No capture commit
or publication has occurred. Review in this local worktree without discarding it.

From that directory run `npm run prototype:visual-playground`, then open
<http://localhost:3100/dev/visual-playground>. Choose A and use the lab's screen/
scenario controls; workshop links are listed in the workshop document. Start
with `src/features/visual-playground-prototype/README.md`. Screenshots and notes
are in `docs/design/visual-playground-evidence/` inside that worktree.

The prototype uses fictional fixtures and resettable memory. It is evidence of
composition and scripted interaction, not real consent, persistence, notification
delivery, production authorization or concurrency. Browser checks passed as
recorded in the workshop, but uncoached usability and real software-keyboard
operation have not been established.

## Review completion

The specification is ready for issue conversion when consequential policy gates
are accepted or explicitly deferred, existing-contract differences are resolved,
and each proposed slice has observable acceptance criteria and known dependencies.
Deferred policies must not be silently implemented by a skeleton or schema ticket.

The canonical review package is in the source workspace at
`/Users/akscott/Code/stagecom-react/docs/specs/`. The prototype worktree's earlier
draft is historical; use this consolidated version for the independent review.
