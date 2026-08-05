# Issue tracker: Linear

Issues, specs, and implementation tickets for this repository live in Linear. Use the official Linear MCP for all tracker operations. Do not create GitHub Issues.

## Scope

Use the Linear team `Stagecom`. There is currently no Stagecom Linear project;
do not invent or infer one. If more than one team could apply, ask the
maintainer before creating or moving issues.

The introductory Linear issues are onboarding material and must not be modified unless the maintainer explicitly requests it.

## Reading issues

When given a Linear issue identifier or URL, read its complete description, comments, labels, parent/sub-issue relationships, and blocking relationships before acting.

## Creating work

- `to-spec` publishes the approved specification as a Linear issue.
- `to-tickets` creates one Linear issue per approved tracer-bullet ticket.
- Use Linear parent/sub-issue relationships when tickets belong to a specification.
- Use Linear's native blocked/blocks relationships for dependency edges.
- Apply `ready-for-agent` to approved implementation tickets unless instructed otherwise.
- Use Stagecom domain terminology in titles and descriptions.
- Do not create, modify, close, or move issues without confirming the proposed
  outcome with the maintainer, except for the ticket-scoped implementation
  lifecycle described in `docs/agents/delivery-workflow.md`.

Invoking the `implement` skill authorizes the ordinary ticket-scoped lifecycle
through `In Progress` and `In Review`. `Done` still requires a verified merge.
See `docs/agents/delivery-workflow.md` for the complete authorization boundary.

## Wayfinding Operations

Use the `wayfinder:map` label for a Wayfinder map issue. Use the corresponding
type label on each child issue:

- `wayfinder:research`
- `wayfinder:prototype`
- `wayfinder:grilling`
- `wayfinder:task`

Represent map nodes as child issues and dependency edges with Linear's native
blocking relationships. A frontier ticket is open, unblocked, and unassigned.
Claim it by assigning it before starting work. Resolve it with a result comment,
the relevant artifact or pull-request link, and the appropriate status change;
keep the map issue updated with pointers rather than duplicating full results.

## Availability

If the Linear MCP is unavailable or unauthenticated, stop and request reconnection. Do not silently fall back to GitHub Issues or local Markdown.
