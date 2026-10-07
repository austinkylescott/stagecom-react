---
target: Callsheet
total_score: 22
max_score: 40
na_heuristics: ""
p0_count: 0
p1_count: 1
target_identity: "file:/Users/akscott/.codex/worktrees/a145/stagecom-react/src/features/callsheet/components.tsx"
target_fingerprint: "sha256:2433ab6857e99306ca8f42d1754b579cbd4f363acbe61d22ecadc3007e013968"
target_path: /Users/akscott/.codex/worktrees/a145/stagecom-react/src/features/callsheet/components.tsx
timestamp: 2026-10-06T01-57-59Z
slug: src-features-callsheet-components-tsx
---
Method: dual-agent (A: /root/callsheet_design · B: /root/callsheet_evidence)

# Callsheet critique

The information model separates the right concepts, but the composition does not prioritize them. Callsheet reads as six equally important sections rather than a personal working agenda.

## Design health

Scores are design judgments, not acceptance-test results. Response/error handling was assessed from source without submitting actions.

| Heuristic | Score | Main observation |
|---|---:|---|
| System status | 3 | Explicit states; pending responses only disable controls |
| Match with real work | 2 | Calls lack practical details; decisions follow discovery |
| Control and freedom | 2 | Navigation and decline exist; authority consequences need context |
| Consistency | 3 | Familiar controls, inconsistent personal/shared-work composition |
| Error prevention | 2 | Disabled pending actions; little invitation consequence context |
| Recognition over recall | 2 | Sparse Event summaries, duplicate visible Event titles |
| Efficiency | 2 | Large cards and no compact/jump navigation |
| Minimalist design | 2 | Repetitive explanation and equal heading emphasis |
| Error recovery | 3 | Inline alerts/retry copy in source; not exercised |
| Help | 1 | Explanation describes the system rather than the user's decision |
| **Total** | **22/40** | **Significant improvements needed** |

## Specificity and overall impression

Theater relationships and commitment states are specific to Stagecom; the repeated card composition is interchangeable with a generic dashboard. The strongest opportunity is to make outstanding work and upcoming commitments immediately scannable.

The CLI scan returned zero findings (exit 0, JSON []). A clean mechanical scan does not establish useful hierarchy. Browser inspection independently confirms the design assessment: desktop height 2480 px, phone height 3242 px; shared decisions begin around y=1500 desktop and y=2090 phone. Page and section headings render at 24 px with weight 600.

## What works

- Responses and confirmed Calls are distinct.
- Theater and relationship labels explain why items belong to the viewer.
- Semantic sections and named Event links are present; long titles wrap without observed horizontal overflow at 390 px.

## Priority issues

1. **[P1] Shared decisions are buried behind browsing.** The observed session had no personal responses but three authorized decisions below six Relevant Event cards and empty discovery. Move distinct response and shared-decision groups before browsing; add a compact summary linking to outstanding work. Source: components.tsx, EventSection calls before shared-work section. Suggested command: $impeccable layout.
2. **[P2] The agenda uses oversized cards without sufficient practical information.** One Call occupies roughly 300 px and repeats “Review call” as metadata and action. Use compact dated agenda entries, remove duplication, and include occurrence type, location and end time when available. Some fields require a read-model extension, not just CSS. Suggested command: $impeccable distill.
3. **[P2] Event summaries require opening details to distinguish them.** Cards show only Theater/title/Open Event. Two distinct Events have identical visible title and Theater. Add truthful relationship and state/date context; make the growing directory secondary. Suggested command: $impeccable clarify.
4. **[P2] Authority invitations need consequence context.** Source provides immediate authority/ownership acceptance but no inviter or responsibility explanation in Callsheet. Present concise scope and a review step where consequences warrant it. This was source-reviewed, not observed in the current live state. Suggested command: $impeccable harden.
5. **[P2] Equal headings and repetitive copy dilute importance.** Page/section headings share the same rendered size/weight. Introductory text, empty panels and routine “Urgency” labels consume attention. Establish page/section/item hierarchy, remove redundant explanation, and reserve urgency cues for actual time pressure. Suggested command: $impeccable typeset and $impeccable clarify.

## Cognitive load and emotional journey

Five checklist weaknesses: single focus, chunking, hierarchy, minimal choices and progressive disclosure. Six equally weighted Event-opening choices precede decision work. “Nothing needs your response” is locally accurate, but can falsely suggest being caught up when shared decisions remain far below it. Successful inline response feedback exists in source; its emotional effect was not tested.

## Persona red flags

- **Power user:** substantial scrolling before finding shared decisions; no compact view or section jumps.
- **Accessibility-dependent user:** named Event links help, but pending controls lack action-specific busy feedback and shared-work link names omit Event identity. Screen-reader behavior was not tested.
- **Distracted phone user:** decision work starts about 2.5 viewports down. Content actions are 36 px high and the navigation control is 28×28 px, below the reference's 44 px comfort target; this is not a verified WCAG failure.

## Minor observations

Raw “published” status and system-oriented “Public-content snapshot” wording need clearer presentation. Cross-Theater Callsheet sits beside a Theater-scoped Calendar with an ambiguous label. An observed React #418 hydration warning merits separate diagnosis; its cause and visible effects were not established.

## Questions to consider

What must a Member learn in ten seconds before rehearsal? Could a confirmed Call carry enough practical detail that opening the Event is optional?
