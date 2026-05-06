# Minimal Design Token Spec

Status: implemented baseline

## Summary

Use a small token system to keep early implementation cohesive without doing a full visual design pass.

The baseline token implementation lives in `src/styles.css` and is previewed on `/dev/components`.

## Colors

Locked brand accents:

```txt
theater: #82bfb6
event: #eaa542
performer: #c76056
```

Core tokens:

```txt
ink
ink-soft
paper
paper-strong
paper-muted
cream
theater
theater-soft
event
event-soft
performer
performer-soft
danger
success
warning
border
focus
```

Semantic mapping:

- `theater`: theater identity, workspace/admin, community.
- `event`: programming, events, schedules, publish states.
- `performer`: people, cast, members, collaboration.
- `paper/ink`: default UI surfaces and text.

Use brand colors as semantic accents, not giant admin backgrounds.

Current neutral baseline:

```txt
ink: #263130
ink-soft: #566461
paper: #fbf6ec
paper-strong: #fffaf1
paper-muted: #f1e5d2
cream: #f8ecd8
```

Implementation notes:

- CSS variables are defined in `:root`.
- Tailwind v4 theme variables map the core colors so utilities can use named tokens.
- Legacy aliases such as `--sea-ink`, `--lagoon`, and `--palm` remain as compatibility aliases while product surfaces migrate toward the clearer token names.
- Dark mode is intentionally not implemented in v1.

## Typography

Self-host key fonts where possible.

Current type choices:

```txt
display: Cubano
sans/body: Public Sans
mono: system monospace
```

CSS font-family tokens:

```txt
--font-display-family
--font-sans-family
--font-serif-family
--font-mono-family
```

Public Sans is loaded from Google Fonts. Cubano is not available from Google Fonts, so the display face is loaded from the local font file.

Current local Cubano file:

```txt
public/fonts/Cubano.ttf
```

Preferred optimized files for later:

```txt
public/fonts/Cubano.woff2
public/fonts/Cubano.woff
```

`woff2` is preferred for production payload size. The `woff` file is optional fallback coverage.

Current `@font-face` block in `src/styles.css`:

```css
@font-face {
  font-family: 'Cubano';
  src: url('/fonts/Cubano.ttf') format('truetype');
  font-display: swap;
  font-style: normal;
  font-weight: 400;
}
```

Roles:

```txt
display
sans
serif
mono
```

Named scale:

```txt
display-xl
display-lg
page-title
section-title
body
body-small
caption
mono-small
```

CSS utility classes:

```txt
type-display-xl
type-display-lg
type-page-title
type-section-title
type-body
type-body-small
type-caption
type-mono-small
```

Use display type for identity and strong moments; use sans for forms and operations.

## Shape, Borders, Shadows

Radius:

```txt
radius-none
radius-sm
radius-md
```

Mostly square, with slight radius for inputs and small controls.

Shadows:

```txt
shadow-hard-sm
shadow-hard-md
shadow-hard-lg
```

Use hard shadows for hierarchy, not every card.

Implemented as CSS variables and Tailwind theme shadows:

```txt
--shadow-hard-sm
--shadow-hard-md
--shadow-hard-lg
```

## Background And Layout

Base background: subtle layered paper.

Widths:

```txt
content-narrow
content-standard
content-wide
content-bleed
```

Use Tailwind spacing plus semantic page, section, card, form, and inline gaps.

Implemented helper classes:

```txt
page-wrap
page-wrap-narrow
page-wrap-wide
page-wrap-bleed
```

Spacing tokens:

```txt
--space-page-y
--space-section
--space-card
--space-form
--space-inline
```

## Motion

Minimal purposeful motion only: step transitions, validation, hover/press, publish success, loading transitions.

## Dark Mode

Do not build dark mode in v1, but use token names that can support it later.
