# Design Baseline

Status: active synthesis

The active detailed design baseline lives in `docs/rebuild/06-design-baseline.md` and the minimal token spec lives in `docs/rebuild/13-design-token-spec.md`.

## Direction

- Public pages should feel like civic poster pages.
- Authenticated app pages should feel like calm theater operations.
- Preserve Stagecom fonts and three semantic brand colors, refined for clarity.
- Use previous design work as reference, not law.
- Build `/dev/components` before product pages multiply.

## Fonts

- Display: Cubano.
- Body/UI: Public Sans.

If font files are committed locally, load them from `public/fonts/` and keep CSS font-family names stable.

## Brand Colors

Use the three Stagecom semantic accents in the design system:

- theater/community/admin: `#82bfb6`
- event/show/programming: `#eaa542`
- performer/people/relationship surfaces: `#c76056`

These colors can be adjusted through derived tokens for contrast, but the three source hues should remain recognizable in the interface.

## Surfaces

Public theater pages can be more expressive and poster-like. Authenticated workflows should stay calmer, denser, and task-focused. Keep cards and panels relatively square and avoid decorative effects that compete with operational clarity.

## Component Baseline

`/dev/components` is the working visual contract for tokens, typography, buttons, form states, setup cards, preview bars, public theater headers, and empty/loading states. Update it before multiplying a pattern across product pages.

## Token Source

The implemented token baseline lives in `src/styles.css`. It defines color, type, radius, shadow, width, and spacing variables, plus small helper classes such as `page-wrap`, `type-page-title`, and `type-caption`.
