# Issue tracker: Linear

Issues, specs, and implementation tickets for this repository live in Linear. Use the official Linear MCP for all tracker operations. Do not create GitHub Issues.

## Scope

Use the Linear team and project associated with Stagecom. If more than one team or project could apply, ask the maintainer before creating or moving issues.

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
- Do not create, modify, close, or move issues without confirming the proposed outcome with the maintainer.

Invoking `/implement` for an issue authorizes moving that issue through `In Progress`, `In Review`, and `Done` as the corresponding implementation stages are reached. This authorization applies only to the implementation ticket being worked; it does not extend to parent, related, or introductory issues.

## Availability

If the Linear MCP is unavailable or unauthenticated, stop and request reconnection. Do not silently fall back to GitHub Issues or local Markdown.
