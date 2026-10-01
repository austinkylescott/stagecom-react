# Design Baseline

Status: active synthesis

The current implementation starts from stock shadcn/ui New York components and
the default Neutral light theme. The maintainer requested a fresh generic
baseline across public pages, authentication, and the authenticated workspace.
Branding follows a separate human presentation review.

## Components

Registry primitives live in `src/components/ui`, generated with the project
configuration in `components.json`. Compose their standard variants instead of
restyling their typography, colors, borders, or control sizes at call sites.
Application navigation uses the stock Sidebar composition; route selection and
Theater switching remain application behavior. The mobile Sidebar adds focus
restoration to its external trigger when its Sheet closes.

Product forms use Button, Input, Textarea, Label, and NativeSelect. Shared
surfaces use Card and semantic Table/Badge compositions. Layout adjustments,
including wrapping long demo-persona descriptions, remain appropriate.

## Typography And Theme

Use system sans typography, default component radii, semantic colors, and stock
component shadows. The global token source is `src/styles.css`. The baseline
is light-only; future dark-mode and branding choices require their own review.
The old Cubano/Public Sans pairing, three brand accents, decorative backgrounds,
hard shadows, and legacy color aliases are no longer the active implementation.
Historical proposals remain under `docs/rebuild/` as reference.

## Working Contract

`/dev/components` demonstrates the current tokens, buttons, form controls, and
People table. Use it to review primitives before repeating a presentation
pattern across product routes. The local database-backed personas exercise real
Auth, reads, actions, and persistence; do not substitute a parallel mock app.
