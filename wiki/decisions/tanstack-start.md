# Decision: TanStack Start

Status: accepted

Implementation status: implemented

Stagecom rebuild uses TanStack Start to explore a modern full-stack React architecture while preserving a cohesive frontend/server codebase.

Key reasons:

- React practice without splitting frontend and backend too early.
- File-based routing with strong type safety.
- Server functions and API routes for app-owned workflow boundaries.
- Good fit for agent-readable conventions when documented clearly.

Architectural consequence: route files stay thin, and feature modules own commands, queries, public queries, schemas, and server-function wrappers.
