# Stagecom Wiki

Documentation status: active

Implementation status: partially implemented

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
- Membership and governance: `wiki/product/membership-and-governance.md`
- Foundation slice: `wiki/features/first-slice.md`
- First meaningful milestone: `wiki/features/event-publication-milestone.md`
- Event lifecycle: `wiki/workflows/event-lifecycle.md`
- Casting and availability: `wiki/workflows/casting-and-availability.md`
- Review, scheduling, and publication: `wiki/workflows/review-scheduling-and-publication.md`
- Data model: `wiki/data/data-model.md`
- Permissions: `wiki/data/permissions-model.md`
- Stack and layout: `wiki/architecture/stack-and-layout.md`
- Design system: `wiki/design/design-system.md`
- Decisions: `wiki/decisions/`

## Current Direction

Stagecom is being rebuilt as a TanStack Start, React, TypeScript, and Supabase app centered on theater operations. The first meaningful product win is a multi-user journey from Theater membership through Event casting, scheduling, review, approval, and publication.

## Raw Docs

- PRD: `docs/product/PRD.md`
- Data model: `docs/data/data-model.md`
- Design baseline: `docs/design/design-baseline.md`
- Coding rules: `docs/development/coding-rules.md`
- First slice spec: `docs/specs/first-slice.md`
- Event publication milestone decision: `docs/product/event-publication-milestone.md`
- Rebuild planning index: `docs/rebuild/00-index.md`
