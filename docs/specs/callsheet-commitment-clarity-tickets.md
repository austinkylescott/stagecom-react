# Callsheet commitment clarity — proposed tickets

Status: draft for approval; not yet published to Linear. October 7, 2026.

Source: the Callsheet commitment and acceptance clarity specification. All five
issues will be children of its new Linear specification and carry ready-for-agent.
Each feature ticket includes its scoped query/UI/test path; there is no separate
schema-only, API-only or UI-only ticket. No prefactor is currently required.

## 1. Explain invitation responsibility before acceptance

### What to build

Let an Admin, ownership or Staff invitee recognize the offer and understand the
responsibility before explicitly accepting or declining from Callsheet. Keep
existing authorization, response commands and pre-acceptance disclosure limits.

### Acceptance criteria

- [ ] Admin invitations identify the Theater, recipient relationship, recorded inviter and offer time when available, and explain that acceptance grants Admin authority while decline grants none.
- [ ] Ownership offers identify the proposer and explain that acceptance makes the recipient Owner and changes the former Owner to the transfer's recorded resulting role.
- [ ] Staff invitations identify the Event, Theater, inviter and assigned responsibility, with enough authorized context to decide.
- [ ] Missing historical context is not fabricated; no Occurrence start is presented as an invitation deadline.
- [ ] A review path or in-place disclosure is available when fuller deciding details are needed and does not accept the offer merely by opening it.
- [ ] Inviter/context reads are scoped to the authorized recipient and active Theater membership; pending invitees do not receive accepted-Cast roster, Candidate Slots or private schedule details.
- [ ] Accept/decline remain explicit; pending state prevents duplicate submissions, failed responses remain actionable, and commands recheck current authority/state.
- [ ] A successful response clears the personal task and reports the actual result while confirmed Calls remain visible after reload.
- [ ] Component, query authorization and disposable local authenticated journey tests verify external behavior for all three invitation kinds on desktop and phone.
- [ ] Documentation and before/after snapshots record behavior, test results and any skipped execution limits.

### Blocked by

None (can start immediately).

## 2. Show what each confirmed personal Call requires

### What to build

Make the person's gathering and attendance expectation understandable in the
Callsheet agenda, persistent desktop agenda and mobile disclosure, with consistent
date/time and timezone information across those surfaces.

### Acceptance criteria

- [ ] Required and Optional Calls remain distinct in the authorized projection and presentation.
- [ ] Rehearsal and Performance Occurrence types are visible alongside the personal Call time before opening an Event workspace.
- [ ] Desktop dashboard/sidebar and mobile agenda disclosure show the same Call meaning, Event and Theater; the compact phone trigger remains usable.
- [ ] All schedule representations describe the same instant with an explicit timezone and a hydration-safe server/client policy.
- [ ] The agenda retains every eligible future personal Call across active Theaters, independent of Publication, with deterministic chronological order.
- [ ] Not-called, cancelled/completed, past, undated and invalid schedule entries do not become upcoming personal attendance.
- [ ] Accepted Cast and Staff see their authorized personal schedule; leadership or Operator authority alone does not imply Cast participation or attendance.
- [ ] Call links continue to open the corresponding authorized Occurrence anchor, and Event workspace dates remain identifiable as Event context rather than personal Calls.
- [ ] Existing query/read-model tests and the local authenticated browser journey cover Required/Optional, Rehearsal/Performance, Cast/Staff, two Theaters and timezone transitions.
- [ ] Documentation and desktop/phone snapshots record the resulting behavior and verification limits.

### Blocked by

None (can start immediately).

## 3. Distinguish same-title Event destinations accessibly

### What to build

Let people choose the intended Event workspace from visible links or a screen
reader's links list even when Events share a title, without expanding every row
or removing compact Cast avatars.

### Acceptance criteria

- [ ] Accessible Event link names preserve recognizable visible title text and include the Theater and concise distinguishing context.
- [ ] Same-title Events in different Theaters and within one Theater have distinct meaningful names using authorized lifecycle/date context.
- [ ] Link naming does not expose unavailable private details or rely on opaque route IDs as user-facing descriptions.
- [ ] Visible metadata is expanded only where ambiguity remains; accepted compact rows, tooltip avatars and current destinations remain intact.
- [ ] Keyboard/screen-reader-oriented component checks can distinguish the links and follow each to the correct authorized destination.
- [ ] Full Cast names remain available by focus and tap without following the Event link.
- [ ] Desktop and phone long-title/collision fixtures remain usable without horizontal overflow, with snapshots and limits recorded.

### Blocked by

None (can start immediately). Existing authorized Event summary fields are
sufficient; this slice does not require ticket 2's new Call fields.

## 4. Recover from a failed Callsheet read

### What to build

Give a person an explicit way to retry a failed Callsheet load and a valid
alternate destination, without a Return to Callsheet self-link loop or confusing
failure with an empty personal workspace.

### Acceptance criteria

- [ ] A failed full Callsheet read presents an actionable Retry Callsheet control that retries the relevant read/invalidation.
- [ ] A successful retry renders current data at the intended Callsheet location; repeated failure keeps recovery usable.
- [ ] A valid alternate authorized destination exists and is not another link to the same failed Callsheet state.
- [ ] Authentication and forbidden outcomes retain their appropriate recovery rather than promising that retry grants access.
- [ ] Failed, pending and genuinely empty reads remain distinct; hidden empty sections do not mask unavailable data.
- [ ] The desktop sidebar/mobile personal-agenda retry remains independent and functional.
- [ ] Deterministic browser fault injection at the existing app-owned read boundary verifies transient failure, recovery, repeated failure and alternate navigation without corrupting shared data.
- [ ] Recovery controls have meaningful names and visible keyboard focus on desktop and phone; snapshots and documentation record verified behavior.

### Blocked by

None (can start immediately).

## 5. Integrate and verify the clarified Callsheet journey

### What to build

Bring the four improvements together, perform a bounded polish pass, and leave a
reviewable desktop/phone journey proving that someone can understand a response,
act explicitly, and retain their confirmed personal Calls.

### Acceptance criteria

- [ ] All four feature slices are integrated without changing the accepted personal-first hierarchy, hidden empties, Theater dropdown, Your Next Events, compact rows or avatars.
- [ ] The real authenticated local journey starts at Callsheet through visible navigation, identifies invitation context, responds, reloads, verifies the task clears and confirms the existing Calls remain.
- [ ] The integrated journey distinguishes gathering type, Call requirement and timezone, chooses same-title Events correctly, and recovers from a simulated read failure.
- [ ] Ordinary Member, multi-Theater and mixed Operator/Cast fixtures are identified separately; a Member login with Operator authority is not claimed as an ordinary-Member test.
- [ ] Desktop and phone checks cover keyboard reachability, avatar/disclosure behavior, long titles, same-title destinations and responsive overflow; before/after snapshots are saved.
- [ ] Appropriate unit/query/component tests, local browser scenarios, typecheck, scoped lint and production build pass; skipped or unavailable checks are reported explicitly.
- [ ] Polish repairs regressions introduced by these changes without expanding into deferred branding, portal navigation or unrelated cosmetic work.
- [ ] The current handbook, spec and review record describe implemented behavior and remaining limits accurately.
- [ ] Maintainer review can assess what was accepted, what changed and what remains committed; automated checks do not claim uncoached, physical-device, branding or release approval.

### Blocked by

- Ticket 1 — Explain invitation responsibility before acceptance.
- Ticket 2 — Show what each confirmed personal Call requires.
- Ticket 3 — Distinguish same-title Event destinations accessibly.
- Ticket 4 — Recover from a failed Callsheet read.
