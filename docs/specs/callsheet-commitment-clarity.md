# Callsheet commitment and acceptance clarity

Status: approved and published as [STA-76](https://linear.app/stagecom/issue/STA-76/clarify-callsheet-commitments-and-acceptance). October 7, 2026.

## Problem Statement

Callsheet now has a clearer personal-first hierarchy, compact Event workspaces,
persistent upcoming Events, conditional sections and Cast avatar tooltips. A
person can find work, but cannot always explain what they are accepting or
attending before acting. Admin authority, Theater ownership and Staff invitations
lack sufficient context; personal Calls omit Occurrence type and required versus
optional participation. Identically named Event destinations lose distinguishing
context in accessible names, and a failed Callsheet offers a link back to itself.

These gaps prevent the agreed neutral presentation review from establishing that
a Member understands participation, commitment and authority. The October 7
critique scored 24/40. That score is agent assessment, not usability acceptance.

## Solution

Keep the accepted composition and give each decision its essential facts. A
recipient sees who offered responsibility and what acceptance changes. A person
sees the gathering type, Call obligation and timezone before opening an Event.
People using assistive technology can distinguish same-title Event links. A
person whose Callsheet cannot load can retry it or navigate to a valid alternate
destination without looping back to the same failed page.

## User Stories

1. As a Theater Member, I want personal responses separated from shared decisions, so that I understand which work is mine.
2. As a Member holding several relationships, I want each action to state the relationship that permits it, so that I do not need a role-mode switch.
3. As an Admin invitee, I want to know who offered Admin authority, so that I can recognize the invitation.
4. As an Admin invitee, I want to understand the authority acceptance grants, so that I can make an informed decision.
5. As an Admin invitee, I want acceptance and decline to remain explicit, so that merely reading the invitation does not grant authority.
6. As a proposed successor, I want to understand that acceptance makes me the Theater's Owner, so that I understand the responsibility I am taking on.
7. As a proposed successor, I want to see the former Owner's recorded resulting relationship, so that the transfer consequence is factual.
8. As a proposed successor, I want to recognize who proposed the transfer, so that I can evaluate the offer in context.
9. As a Staff invitee, I want the Event, Theater and assigned responsibility visible before acceptance, so that I know what work is being requested.
10. As a Staff invitee, I want to know who invited me, so that I can recognize the offer.
11. As an invitation recipient, I want the offered time shown when recorded, so that I can identify the offer without invented deadlines.
12. As an invitation recipient, I want an authorized review path when additional detail is necessary, so that I can inspect the offer without accepting it.
13. As an invitation recipient, I want pending, failure and success feedback, so that I know whether my response was recorded.
14. As an invitation recipient, I want a stale or unauthorized offer rejected by the existing command, so that presentation does not bypass current authority.
15. As a Cast invitee, I want enough deciding context without private accepted-Cast or schedule details, so that invitation review preserves disclosure boundaries.
16. As a scheduled Cast Member, I want to distinguish a Rehearsal from a Performance, so that I understand the gathering I am attending.
17. As a scheduled participant, I want required and optional Calls distinguished, so that I know whether attendance is expected.
18. As a scheduled Staff Member, I want the same Call context for my own assigned schedule, so that my responsibility is understandable.
19. As a Member across Theaters, I want upcoming personal Calls ordered by time and labeled by Theater, so that I can plan across memberships.
20. As a scheduled participant, I want consistent date, time and explicit timezone information, so that the sidebar and dashboard do not imply different times.
21. As a scheduled participant, I want my Event link to open the corresponding Occurrence, so that I can inspect the correct Call.
22. As a Producer who is not a Cast Member, I want leadership kept distinct from personal attendance, so that authority does not imply a Cast commitment.
23. As a person viewing an Event workspace, I want its next Event date distinguished from my personal Calls, so that oversight is not mistaken for attendance.
24. As a screen-reader user, I want same-title Event destinations to have distinct accessible names, so that I can select the intended Event from a links list.
25. As a multi-Theater user, I want Theater and concise Event context included in ambiguous destinations, so that I can distinguish them without memorizing routes.
26. As a keyboard or phone user, I want Cast avatar names still accessible without following the Event link, so that identity inspection does not navigate away.
27. As a person whose Callsheet read fails, I want a clear retry action, so that I can recover when the service is available again.
28. As a person whose Callsheet read fails, I want a valid alternate destination, so that I can continue authorized work without a self-link loop.
29. As a person with unavailable data, I want failure distinguished from an empty Callsheet, so that hidden empty sections do not hide a read failure.
30. As a person whose session or membership changed, I want the corresponding authentication or authorization recovery, so that retry does not claim access I no longer have.
31. As a reviewer, I want desktop and phone evidence for a response clearing while confirmed Calls remain, so that I can assess the agreed journey.
32. As a reviewer, I want automated, maintainer and uncoached evidence recorded separately, so that passing tests is not presented as usability or branding approval.

## Implementation Decisions

- Preserve the current personal-first Callsheet and the distinction between responses, Calls, shared Work Queue decisions, Notifications and Event context.
- Preserve hidden empty sections, the Theater dropdown, Your Next Events, compact Event rows, Cast avatars and full-name hover/focus/tap tooltips. Do not restore the removed Your Theaters section or permanent up-to-date block.
- Extend the existing authorized Callsheet invitation projection and presentation. Include recorded inviter identity and offer time where available; do not invent unknown identities, history or deadlines. Unknown context must be explicit rather than fabricated.
- Explain Admin authority, ownership transfer and Staff responsibility using the existing domain contracts. Ownership acceptance establishes the successor as Owner; display the transfer's recorded former-Owner role. Decline and pre-acceptance authority remain unchanged.
- Reuse an existing authorized invitation destination when suitable. Where no such surface exists, provide an in-place review disclosure using the same scoped read; do not require a new navigation architecture or modal by default.
- Keep existing response commands, idempotency and current-state authorization. Pending invitees must not gain accepted-Cast roster, Candidate Slots or private scheduling fields through enrichment.
- Extend the personal Call projection with actual required/optional Call requirement and Occurrence type. Display Rehearsal or Performance plus Required or Optional in the dashboard, desktop agenda and mobile agenda disclosure. The mobile trigger remains compact; opening it reveals the full context.
- Apply one hydration-safe time-formatting policy across personal Calls and Event dates: stable UTC during server/initial hydration, browser-local timezone afterward with an explicit zone. Compact and full presentations may differ in date length, but must describe the same instant.
- Keep actual personal Calls chronological, across active Theaters, future-only and publication-independent. Exclude not-called, cancelled, completed, past, undated and invalid schedule entries according to existing authorization and eligibility.
- Do not infer attendance from Producer, Director or Operator relationships. Event workspace dates remain Event context, separately labeled from personal Calls.
- Give workspace links concise accessible names containing distinguishing Theater and Event context. Same-title collisions within one Theater must also be distinct using available lifecycle/date descriptors; avoid identity strings that expose private data. Visible labels and accessible names must remain consistent.
- Add explicit retry/invalidation for failed full Callsheet reads and a valid alternate authorized destination. Do not rely on the sidebar's independent retry or a self-link. Keep unavailable, empty, unauthenticated and forbidden outcomes distinct.
- Keep routes and server functions thin, with behavior in feature queries, read models and commands. Use existing stored facts; no schema change is expected. A discovered schema need must be justified separately, and any remote migration still requires explicit approval.
- Implement four independent vertical slices, followed by integrated polish and verification. Do not introduce a standalone prefactor unless it is genuinely necessary to land a slice green.

## Testing Decisions

Primary seam: the existing authenticated Callsheet browser journey,
from visible navigation through a real response and persistence check against
local Supabase. Test observable behavior and domain outcomes, not component
structure, private helper calls or exact incidental formatting.

- Extend that journey to inspect invitation meaning before acceptance, respond, reload, and confirm the resolved response disappears while existing Calls remain.
- Cover Admin, ownership and Staff response consequences with the existing command tests and local database-backed fixtures. Assert current authorization and stale-state behavior without rewriting command tests to mirror unchanged presentation.
- Exercise Required/Optional and Rehearsal/Performance through the authenticated Call projection and visible dashboard/agenda destinations. Include accepted Cast and Staff, two Theaters, distinct timezones, pending invitees and a leadership-only actor.
- Use focused query authorization tests for new invitation/Call fields, especially recipient-only reads and pre-acceptance redaction. Existing Event portfolio query authorization tests are prior art.
- Extend Callsheet component behavior tests for distinct accessible link names, invitation context and response feedback. Exercise avatar full-name controls as a regression, not as a new feature.
- Test full-page recovery through deterministic browser fault injection at the app-owned read boundary: transient read fails, retry reissues the read, recovery preserves route/context, and the alternate destination is usable. Test forbidden/unauthenticated outcomes separately; do not simulate errors by corrupting shared remote data.
- Use existing read-model and upcoming-Call tests for eligibility/order and consistent instants. Add meaningful server/client timezone coverage rather than assertions against machine-local formatted strings.
- Verify desktop and 390px phone presentation, keyboard access, tooltip/disclosure dismissal and long or same-title Events. Capture before/after snapshots and record source-based versus executed observations.
- Use local Supabase for disposable mutations; never seed/reset shared remote dev for these checks. A skipped local suite is a verification limit, not a passing journey.
- Maintainer acceptance uses the agreed response journey. Uncoached and physical-device review remain distinct subsequent evidence, not claims established by automated checks.

## Out of Scope

- New branding, a visual-world replacement, or adoption of the exploratory Theater-owned portal.
- Restoring removed empty sections or the redundant Theater membership list.
- Minor spacing, typography, overlapping-avatar touch geometry and nested-landmark cleanup unless a priority fix introduces a regression.
- New permission rules, new invitation lifecycle, undoing accepted domain responses, generic confirmation gates, or changes to Notification semantics.
- New Event types, standalone Practices/meetings/workshops/auditions, recurrence, calendar sync or ticket sales.
- Unrequested location/end-time enrichment, publication badges, broad portfolio filtering or unrelated performance refactors.
- Remote migrations/seeding, deployment, merge, release, or claiming branding/pilot readiness without explicit review.

## Further Notes

The maintainer selected commitment and acceptance clarity first and all four
priority issues from the October 7 dual-agent critique. Existing compact UI work
is the baseline, not implementation of this follow-up specification. The review
record remains the source for prior accepted/revised/deferred layout choices.

Published in Linear with ready-for-agent and five child tickets with native
blocking relationships. See the companion ticket breakdown for their links. The four
feature slices can begin independently; the integrated verification ticket is
blocked by all four. Completed historical issues are context only and must not
be reopened or altered. Test seams and ticket granularity were approved by the maintainer on October 7, 2026.
