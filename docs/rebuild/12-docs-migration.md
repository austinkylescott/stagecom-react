# Docs Migration Plan

Status: implemented baseline

## Summary

The new repo should keep the raw-docs/wiki structure, but with cleaner content centered on the TanStack rebuild and theater-ops-first product direction.

The baseline migration is complete. `docs/rebuild/` remains the historical planning record, while `docs/` and `wiki/` now hold active synthesis docs for product, data, design, development, and first-slice implementation.

## Structure

```txt
docs/
  product/
  data/
  design/
  development/
  specs/
  rebuild/
  archive/
wiki/
  _index.md
  product/
  data/
  architecture/
  design/
  features/
  decisions/
```

## Product Docs

Rewrite the PRD now. Preserve contextual roles, privacy, producer/cast separation, theater trust, and reduced off-platform coordination. Update around theater-ops-first, hosted SaaS first, self-host-compatible later, public theater home as first win, and Events as product language.

## Data Docs

Rewrite from current schema plus reset delta. Explain Events UI vs `shows` DB, theater lifecycle, roles, invites, activity, acts, staff defaults, and generated types.

## Design Docs

Use new design baseline as active truth. Keep selected prior/Stitch material under `docs/archive/design/` as non-authoritative reference.

## Development Docs

Rewrite for TanStack. Remove Nuxt-specific rules. Include route conventions, command/query split, server functions, Supabase clients, AppError, docs/wiki workflow, and commit policy.

## Archive

Use `docs/archive/` for selected old specs, design explorations, Stitch references, and old PRD snapshots. Mark archived docs as historical reference, not active source of truth.

## Wiki

Rewrite fresh from reset plans. Do not copy the current wiki wholesale.

Seeded wiki pages:

- `wiki/_index.md`
- `wiki/product/overview.md`
- `wiki/data/data-model.md`
- `wiki/data/permissions-model.md`
- `wiki/architecture/stack-and-layout.md`
- `wiki/design/design-system.md`
- `wiki/features/first-slice.md`
- `wiki/decisions/events-ui-shows-db.md`
- `wiki/decisions/tanstack-start.md`
