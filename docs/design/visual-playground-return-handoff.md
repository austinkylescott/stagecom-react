# Visual playground archive handoff

Artifact: `/Users/akscott/orca/workspaces/stagecom-react/visual-playground`
Branch: `prototype/visual-playground`. Captured and pushed as throwaway review
evidence under explicit maintainer authorization on September 30, 2026.

Run from this checkout: `npm ci --ignore-scripts`, then
`npm run prototype:visual-playground`. Open
<http://localhost:3100/dev/visual-playground>. No login or database is required.

Start with `src/features/visual-playground-prototype/README.md` for review links,
walkthroughs, fixture assumptions and limitations. Screenshots and the observation
record are in `docs/design/visual-playground-evidence/`.

The maintainer selected A's sidebar structure and neutral shadcn composition,
then accepted the Availability and self-service Team workshop direction.
Responses can be revised until poll closure. A departing Team Owner chooses a
successor when several Members remain; the sole remaining Member owns the Team.
Final branding and unresolved production policies remain open.

The canonical consolidated specification and independent review handoff are on
`main`: `docs/specs/theater-workspace-skeleton-draft.md` and
`docs/specs/theater-workspace-review-handoff.md`. This branch's earlier draft is
historical. Review that main-branch package before creating issues.

Do not merge the throwaway implementation into production. No real persistence,
notification delivery, authorization, concurrency, migration or external message
is implemented. Prototype checks and screenshots establish scripted behavior,
not uncoached usability or software-keyboard operation.
