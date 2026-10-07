# Stagecom Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Theater Members, Event leaders (Producers and Directors), and Theater Operators
(Owners and Admins) are equally important audiences, with tasks shaped by their
actual relationships and authority. A person may hold several relationships or
belong to multiple Theaters. Anonymous visitors discover published programming
and audience admission information.

## Product Purpose

Stagecom coordinates theater membership, performance development, casting,
scheduling, review, and public presentation. Its first meaningful product journey
lets multiple Members develop a viable Event, secure Operational Approval, and
publish its public presentation using one trusted operational record.

## Operating Context

- Callsheet is the personal, cross-Theater starting point for responses needed,
  confirmed commitments, relevant Events, and authorized shared decisions.
- Entering a named Theater opens its programming and community. Operators also
  resolve shared decisions and inspect operational exceptions.
- Event work includes explicit participation, availability collection, schedule
  planning and selected-time confirmation, immutable Proposal review, and public
  content preparation. Approval and Publication are independent.
- Public visitors see published Theater and Event presentations, including
  admission information. Private working revisions remain separate.
- Evaluation uses the existing database-backed application and seeded personas
  with real authentication. Desktop and phone use both matter; emulation does
  not establish physical-device software-keyboard usability.

## Capabilities and Constraints

The existing application uses TanStack Start, React, TypeScript, Supabase, and
shadcn/ui. Preserve working routes, authentication, feature commands and queries,
transactional guarantees, and authorization when changing presentation.

Use [CONTEXT.md](CONTEXT.md) for canonical domain vocabulary and
[wiki/_index.md](wiki/_index.md) for current capability evidence. PRODUCT.md
captures design-relevant product context; it does not replace those contracts.

- User-facing shows are Events. A Producer is not implicitly a Cast Member.
- Team membership, Event participation, staff assignments, and leadership confer
  separate authority; joining a Team does not accept an Event invitation.
- Availability, selected-time confirmation, committed scheduling, Operational
  Approval, and Publication are distinct actions and states.
- Work Queue decisions, watch-only Operational Exceptions, and personal
  Notifications have different meanings. Dismissing a Notification does not
  resolve domain work. Notifications originate from explicit domain events.
- Public reads expose published snapshots; private access follows explicit
  application authorization. Service-role access remains server-only.
- Remote migrations, remote seeding, production changes, merges, and releases
  require explicit approval for the operation. Never expose credentials.
- Native ticket sales, external calendar sync, recurrence, and broader modeled
  venue resources are outside the current milestone. Exploratory conversation
  and rich-profile ideas are not implemented capabilities.

## Brand Commitments

The product name is Stagecom. Final branding remains undecided and follows
explicit review. Historical fonts, palettes, and prototype artwork are references,
not binding commitments for future work.

## Evidence on Hand

- Existing feature implementations and tests under `src/features/` and `e2e/`.
- Seeded Compass Rose Players and Harbor Stage scenarios and authenticated
  personas described in [demo-environment.md](docs/development/demo-environment.md).
- A hosted dev persona chooser at <https://stagecom-app-dev.vercel.app/login>.
- Connected desktop/phone screenshots, verification limits, and pending human
  review decisions in [neutral-workspace-review.md](docs/design/neutral-workspace-review.md).
- Maintainer feedback on October 5, 2026: pages lack clear hierarchy and action
  guidance; headings and descriptions are repetitive or unnecessary. This is
  evidence for the next design pass, not proof that every page was reviewed.

Automated checks and internal walkthroughs do not establish uncoached usability.
Do not invent audience research, adoption metrics, testimonials, or product claims.

## Product Principles

Confirmed by the maintainer on October 5, 2026:

1. Make the next authorized action clear.
2. Distinguish responses from commitments and decisions.
3. Show essential information before supporting explanation.
4. Serve Members, Event leaders, and Operators through their actual tasks and
   relationships, without requiring a role-mode switch.

## Accessibility & Inclusion

Preserve keyboard reachability, visible focus, meaningful control names, dialog
focus behavior, readable identity alongside avatars, non-color state cues, and
usable phone layouts. Device observations and uncoached user findings remain
separate evidence from automated checks.
