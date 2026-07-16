# Domain Docs

This is a single-context repository.

## Before exploring

Read:

- `CONTEXT.md` at the repository root, when present.
- Relevant ADRs under `docs/adr/`.
- The existing wiki synthesis and source-of-truth documents listed in `AGENTS.md`.

Missing domain files are created lazily by the domain-modeling workflows as terminology and decisions are resolved.

## Vocabulary

Use terms defined in `CONTEXT.md` in issue titles, specifications, code, tests, and architecture proposals. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is absent, reconsider whether it belongs to the existing vocabulary or note it for domain modeling.

## Architecture decisions

Surface conflicts with existing ADRs explicitly instead of silently overriding them.

Example:

> Contradicts ADR-0007 — worth reconsidering because…
