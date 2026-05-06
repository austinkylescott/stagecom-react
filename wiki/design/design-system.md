# Design System

Status: active synthesis

The design system starts from `docs/design/design-baseline.md` and the living `/dev/components` route.

## Direction

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
