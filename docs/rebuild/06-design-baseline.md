# Design Baseline Plan

Status: active rebuild plan

## Summary

Design should be a functional operating system, not a polish blocker. Prior design work and Google Stitch outputs are references, not binding law.

## Direction

- Keep and refine poster/playbill typography.
- Preserve Stagecom display/body font direction.
- Keep mostly square tactile surfaces and hard offset shadows, but reduce heaviness in app workflows.
- Public pages: civic poster page.
- Authenticated pages: calm theater ops.
- Brand colors stay semantic accents:
  - theater/community/admin
  - event/programming
  - performer/people

## Layout

- Moderate layout rules, not strict grid.
- Define page max widths, spacing, shell regions, card/panel rules, form layout, and preview composition.
- Mobile must be solid; desktop can use richer composition.

## `/dev/components`

Create before product pages. It must show:

- tokens/colors
- typography
- buttons/links
- form controls
- validation/error states
- cards/panels
- alerts
- empty/loading states
- auth card
- onboarding choice card
- setup stepper
- address form
- logo upload card
- publish gate
- admin preview bar
- public theater poster header
- coming-soon programming state

## Motion

Use purposeful minimal motion for step transitions, validation, hover/press, publish success, and loading transitions.
