# Stagecom Wiki

Documentation status: active

Implementation status: partially implemented

The operational-workspaces capability is implemented for the verified paths;
each feature page describes its evidence and remaining limits.

This wiki is the canonical current handbook for Stagecom. It explains the product through the questions readers bring and links to testable specs where more detail is required. Use `CONTEXT.md` for canonical vocabulary and `docs/rebuild/` only for historical planning context.

## Status Language

Every wiki page declares one of these implementation states:

- `Implemented`: the described behavior is backed by working product code.
- `Partially implemented`: some described behavior works, but material gaps remain.
- `Specified, not implemented`: the behavior is agreed and documented but not built.
- `Exploratory`: the direction is being investigated and is not a commitment.
- `Deferred`: the behavior is intentionally outside the current milestone.

## Start Here

- Product: `wiki/product/overview.md`
- Connected neutral workspace review checkpoint (STA-75): `docs/design/neutral-workspace-review.md`
- Callsheet commitment clarity follow-up spec (draft): `docs/specs/callsheet-commitment-clarity.md`
- Callsheet hierarchy refinement and before/after snapshots: `docs/design/callsheet-hierarchy-review.md`
- Reviewed Team Cast invitation verification (STA-73): `docs/design/team-cast-invitation-review.md`
- People and self-service Teams: `wiki/features/self-service-teams.md`
- Membership and governance: `wiki/product/membership-and-governance.md`
- Foundation slice: `wiki/features/first-slice.md`
- First meaningful milestone: `wiki/features/event-publication-milestone.md`
- Operational-workspaces milestone and verification: `wiki/features/operational-workspaces.md`
- Published Theater/Event discovery (STA-74): `docs/design/public-programming-review.md`
- Event lifecycle: `wiki/workflows/event-lifecycle.md`
- Casting and availability: `wiki/workflows/casting-and-availability.md`
- Availability polls and their persistence contract: `wiki/features/availability-polls.md`
- Review, scheduling, and publication: `wiki/workflows/review-scheduling-and-publication.md`
- Data model: `wiki/data/data-model.md`
- Permissions: `wiki/data/permissions-model.md`
- Stack and layout: `wiki/architecture/stack-and-layout.md`
- Design system: `wiki/design/design-system.md`
- Mobile-first visual redesign playground brief: `docs/design/visual-playground-brief.md`
- Theater Calendar and Occurrence return context (STA-68): `docs/design/theater-calendar-review.md`
- Named Theater portal and Event navigation (STA-67): `docs/design/theater-event-navigation-review.md`
- Stock shadcn Callsheet workspace foundation (STA-66): `docs/design/callsheet-workspace-review.md`
- Selected Member Home prototype direction (STA-64): `wiki/design/member-home-direction.md`
- Programming and community design synthesis (STA-58): `wiki/design/programming-and-community-direction.md`
- Reviewed programming Calendar and move prototype direction (STA-63): `src/features/programming-calendar-prototype/README.md`
- Operational actor/state matrix: `docs/design/operational-actor-state-matrix.md`
- Operational-workspaces validation: `wiki/design/operational-workspaces-validation.md`
- Operational-workspaces implementation evidence: `wiki/features/operational-workspaces.md`
- Decisions: `wiki/decisions/`

## Current Direction

Stagecom is being rebuilt as a TanStack Start, React, TypeScript, and Supabase app centered on theater operations. The first meaningful product win is a multi-user journey from Theater membership through Event casting, scheduling, review, approval, and publication.

## Raw Docs

- PRD: `docs/product/PRD.md`
- Data model: `docs/data/data-model.md`
- Design baseline: `docs/design/design-baseline.md`
- Coding rules: `docs/development/coding-rules.md`
- First slice spec: `docs/specs/first-slice.md`
- Operational workspaces spec: `docs/specs/operational-workspaces.md`
- Theater workspace skeleton review spec: [review draft](../docs/specs/theater-workspace-skeleton-draft.md) and [independent review handoff](../docs/specs/theater-workspace-review-handoff.md). Neutral shadcn foundation, Availability polls and self-service Teams; review before issue creation.
- Event publication milestone decision: `docs/product/event-publication-milestone.md`
- Rebuild planning index: `docs/rebuild/00-index.md`
