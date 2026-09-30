# Design System

Documentation status: active

Implementation status: implemented

The design system starts from `docs/design/design-baseline.md` and the living `/dev/components` route.

The [visual playground brief](../../docs/design/visual-playground-brief.md)
reopens fonts, colors, spacing, styling, and layouts in a separate mobile-first
shadcn exploration. The prescriptions below describe the existing implementation;
they do not constrain that playground. Production adoption follows visual review.

## Direction

The maintainer's reviewed next step is a neutral shadcn component skeleton,
followed by layout review and then branding. The
[review specification](../../docs/specs/theater-workspace-skeleton-draft.md)
captures that sequence and its production boundaries; existing production tokens
remain the implemented baseline while the new foundation is reviewed.

- Public pages: civic poster/playbill energy.
- Authenticated app: calm theater operations.
- Components: practical, readable, and reusable before decorative.

## Fonts

- Display: Cubano.
- Body/UI: Public Sans.

## Brand Colors

- Theater/community/admin: `#82bfb6`
- Event/show/programming: `#eaa542`
- Performer/people/relationships: `#c76056`

Derived tokens can adjust contrast and state behavior, but these source colors should remain visible in the system.

## Working Contract

Use `/dev/components` to validate typography, tokens, form states, setup surfaces, preview bars, and public theater page pieces before repeating them across product routes.

## Implementation Source

Design tokens are implemented in `src/styles.css`. The current baseline intentionally omits dark mode while keeping token names that can support it later.
