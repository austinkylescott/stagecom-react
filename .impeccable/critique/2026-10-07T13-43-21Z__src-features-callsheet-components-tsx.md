---
target: Callsheet against documented goals and decisions
total_score: 24
max_score: 40
na_heuristics: ""
p0_count: 0
p1_count: 2
target_identity: "file:/Users/akscott/.codex/worktrees/a145/stagecom-react/src/features/callsheet/components.tsx"
target_fingerprint: "sha256:56a82db22073af98383501cb9a53840cb45774637b5f4a30a2a580bb0b36c319"
target_path: /Users/akscott/.codex/worktrees/a145/stagecom-react/src/features/callsheet/components.tsx
timestamp: 2026-10-07T13-43-21Z
slug: src-features-callsheet-components-tsx
---
Method: dual-agent (A: /root/callsheet_goal_review · B: /root/callsheet_evidence_review)

The Callsheet is closer to the documented goals, but is not yet ready for neutral-presentation acceptance. Its structure is sound; the remaining priority is explaining commitments and authority before users act. Another visual redesign would address less than a focused clarity and recovery pass.

Reviewed PRODUCT.md, CONTEXT.md, ADR 0002, the operational-workspaces contract, Member Home direction, neutral review criteria, and all seven Callsheet refinement passes. Latest decisions govern: keep conditional sections, persistent Your Next Events, compact rows, and tooltip avatars. Theater-owned portal navigation remains exploratory.

## Design specificity

The information architecture is specific to Stagecom: responses, personal Calls, shared decisions, and Event workspaces represent different relationships. The neutral visual language fits the private workspace and undecided branding. The missed specificity is inside each commitment: what gathering is happening, whether attendance is required, and what authority acceptance changes.

## Design health

Operate mode; all ten heuristics apply. Scores combine observed normal states with source-reviewed action/error states, not uncoached usability evidence.

| Heuristic | Score | Main gap |
|---|---:|---|
| Visibility of system status | 3 | Normal state is clear; pending/error states were source-reviewed. |
| Match system and real world | 3 | Calls omit gathering type and obligation. |
| User control and freedom | 3 | Authority acceptance lacks a contextual review path. |
| Consistency and standards | 3 | Main Call time omits timezone shown elsewhere. |
| Error prevention | 2 | Too little context before accepting responsibility. |
| Recognition rather than recall | 2 | Call details and duplicate Event destinations require inspection. |
| Flexibility and efficiency | 2 | Direct anchors help; full-page recovery lacks retry. |
| Aesthetic and minimalist design | 3 | Compact structure works; schedule repetition remains. |
| Error recovery | 2 | A failed Callsheet offers a link back to itself. |
| Help and documentation | 1 | Responsibility and Call meaning lack contextual explanation. |
| **Total** | **24/40** | **Acceptable; meaningful gaps remain.** |

## What works

- Responses and shared decisions remain separate, with relationship and exact-action context. This matches ADR 0002 rather than treating every task as a Notification.
- Empty sections disappear; Event workspaces explain participation/leadership/oversight. A draft with a confirmed date is valid: schedule, Approval and Publication are independent.
- Long titles wrap, the personal agenda follows the user, and avatars reveal full names through keyboard focus and tap. Preserve these accepted decisions.

## Priority issues

### [P1] Acceptance buttons outrun the context needed to decide

Source-based: Admin, ownership and Staff commitments offer direct acceptance with Theater/role/title context, but no inviter, offered-on context, consequence statement or review path. Cast invitations link to their Event; this finding does not claim every response needs inline acceptance.

This fails the documented requirement that participation and authority be understandable. Add authorized invitation-specific context: who offered it, the responsibility/authority change, and a short factual consequence. Provide a Review invitation path where details are necessary. Keep existing explicit acceptance and authorization.

Sources: src/features/callsheet/components.tsx CommitmentCard; queries.ts admin/ownership projections; event-commitments.ts Staff invitation projection. Suggested command: $impeccable clarify.

### [P1] A confirmed Call does not explain the commitment

Observed: Event, date and Cast relationship are visible, but Rehearsal versus Performance and required versus optional participation are not. Source reads both required and optional Calls, then discards that distinction. The main Call date also lacks the timezone shown in the sidebar and Event row.

Preserve authorized Occurrence type and Call requirement in the read model; show Rehearsal · Required or Performance · Optional beside the time. Reuse one hydration-safe timezone formatter. Keep Your Next Events as the accepted heading. Add location/end time only through authorized data.

Sources: event-commitments.ts Call projection, read-model.ts, components.tsx formatCommitmentTime, personal-agenda.tsx. Suggested command: $impeccable clarify.

### [P2] Same-title Event links lose their distinguishing context

Observed: two long-title Events have identical Open Event accessible names. The aria-label overrides Theater/role/lifecycle metadata; date is outside the link. A screen-reader links list cannot distinguish the destinations.

Include Theater and concise lifecycle/date context in accessible names; extend visible descriptors only when collisions remain. Keep compact rows and avatars.

Source: components.tsx EventSection. Suggested command: $impeccable harden.

### [P2] A failed Callsheet links back to itself

Source-based: the loader throws into WorkspaceErrorState, whose recovery action is Return to Callsheet. On Callsheet this provides no explicit retry. The personal agenda has its own retry, but it does not solve full-page failure recovery.

Add a Callsheet retry/invalidation action and a working alternate destination. Preserve permission-specific error handling.

Sources: src/routes/app.callsheet.tsx, src/routes/app.tsx, src/features/application-shell/components.tsx. Suggested command: $impeccable harden.

## Cognitive load and emotional journey

Moderate load: two checklist failures—working memory for missing commitment facts, and six workspace choices in one browsing group. Grouping, hierarchy and progressive disclosure work in the observed state. Six links do not justify an arbitrary cap.

Entry is calm and orienting. Confidence drops when users must ask what they are accepting or attending. Source includes success feedback and removal of resolved tasks; effective full-page failure recovery is incomplete. No emotional response or comprehension was measured.

## Persona red flags

- Member on a phone: finds the time but must open the Event to identify the gathering and obligation. Strip, count and full agenda repeat one Call.
- Operator or responsibility invitee: clear acceptance action, insufficient facts about the authority/responsibility change.
- Keyboard/screen-reader user: avatar focus works, but identical Event link labels discard useful distinguishing metadata.

## Minor observations

- View all Events actually opens confirmed Calls; make the destination label precise without changing the accepted sidebar heading.
- Tight metadata remains small at 12px; prioritize date and commitment facts over repeated relationship lists.
- Phone avatar buttons are nominally 44px but overlap by 16px. Selection worked; reliable physical-device touch remains unverified.
- Double separators and space around the single-Call agenda can be tightened later. Nested main landmarks merit accessibility cleanup.

## Evidence and limits

Detector: components.tsx and personal-agenda.tsx each exited 0 with [], zero findings and no false positives. This does not prove semantics or usability.

Browser: own independent tabs; current Member login also had Operator authority. Zero responses/shared decisions, one confirmed Call and six workspaces. No horizontal overflow at desktop, 390px or 320px. Keyboard focus revealed Morgan Member; phone tap revealed Casey Multi-Theater. Invitation, shared-decision and failure findings are source-based. A timezone hydration risk is inferred, not reproduced.

No overlay: mutable injection is unavailable through read-only browser evaluation. DOM measurements and native screenshots were the fallback. No new live-server, auth changes, domain mutations or UI edits.

Snapshots under docs/design/callsheet-hierarchy-evidence: 12-critique-desktop.jpg, 12-critique-cast-keyboard.jpg, 12-critique-phone-top.jpg, 12-critique-cast-tap.jpg, 12-critique-agenda-sheet.jpg, 12-critique-narrow-phone.jpg.

The next acceptance test remains the documented Member response journey: find the response, explain what acceptance means, respond, and verify the task clears while commitments remain on desktop and phone. Maintainer and uncoached review remain outstanding; this critique does not grant branding or release approval.
