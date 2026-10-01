# Design System

Documentation status: active

Implementation status: implemented

The active baseline is [docs/design/design-baseline.md](../../docs/design/design-baseline.md)
and the living `/dev/components` route.

## Direction

Use a generic shadcn/ui application while reviewing layouts and workflows.
Branding follows a separate maintainer presentation review. The
[workspace specification](../../docs/specs/theater-workspace-skeleton-draft.md)
records the workflow boundaries; the maintainer's subsequent fresh-start
request replaces the earlier visual implementation across product routes.

## Current Foundation

- Stock New York registry components in `src/components/ui`.
- Global default Neutral light tokens in `src/styles.css`.
- System sans typography and default radii, control sizes, and shadows.
- Stock Sidebar with application-owned navigation and Theater selection.
- Standard cards, tables, badges, and form controls.

Cubano, Public Sans, the three brand accents, decorative backgrounds, and hard
shadows are historical design references. They are deferred until branding
review and do not constrain the current generic baseline.

## Working Contract

Use `/dev/components` for primitive review and the local seeded personas for
real product journeys. Keep layout-specific adjustments limited to placement,
responsive behavior, and accessible semantics. `@shadcn/lint` is registered but
has no enabled design rules; selecting enforcement policies is a separate task.
