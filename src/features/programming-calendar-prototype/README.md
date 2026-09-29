# STA-63 programming calendar prototype

Status: reviewed prototype direction for STA-63. This is throwaway UI, not production implementation.

Run `npm run prototype:programming-calendar` and open `/dev/programming-calendar-prototype`. No login or database is needed. Everything is fictional and stays in memory; reload or Reset restores the September 2026 fixture.

For a contextual review, open `/dev/member-journey-prototype?variant=A&persona=member&screen=calendar&calendarView=C`. This embeds the September study within the selected STA-64 Theater journey. Use its Theater navigation, Scenario and Phone width controls, and the Daybook/Dense month toggle. Operators default to Dense month; other scenarios default to Daybook unless `calendarView` is set. The September calendar fixture is separate from STA-64's October Event examples. The standalone route retains the resource-week comparison and role-switching controls.

Compare these shareable layouts using `?variant=A|B|C` and the floating arrow controls:

- **A — Dense month:** all bookings remain visible in date cells; no hidden overflow. At phone width it becomes stacked days.
- **B — Resource week:** Primary Venue occupancy and offsite activities occupy separate lanes, with previous/next week controls. It scrolls horizontally and remains available only on the standalone comparison route.
- **C — Daybook:** dated rows with the booking contact on each activity card; stacked on phones.

Left/right keys cycle layouts outside interactive controls. Hovering a booking, or moving keyboard focus to it, reveals a quick-detail card with timing, venue use, contact, parent Event, Publication state, and the destination opened by the booking. In the STA-64 journey, clicking or pressing Enter on an Event-linked booking opens that Event's workspace with the selected booking and related schedule. Standalone activities and reservations open their own detail page. Browser Back and the explicit Back to Calendar action return to the Calendar. The standalone route keeps its self-contained full-page destination for comparison. Use the Phone canvas button or a narrow browser to compare tap-sized layouts. The layout switcher is development-only.

## Review walkthrough

1. Start as a Theater Member. Find a Performance, an offsite Practice, a Class, and the Sep 7–10 Fringe blackout. Hover or focus each to compare quick details. Open them and confirm that the destination states what this viewer can do; private Cast and decisions remain absent.
2. Switch to Theater Operator. Open **Run-through · Ensemble A on Sep 3**. Its Event page shows the selected Rehearsal, related Event bookings, and the next available action. Preview a move, then try Sep 9 (blackout) and Sep 15 (existing exclusive hold); neither can receive a replacement hold. Try Sep 16, which is clear. The unheld candidate does not appear on the shared Calendar.
3. Grant a replacement hold. Close the detail: the original confirmed booking and the tentative replacement are both visible. Only one replacement is modeled. Reopen either to resume.
4. Switch to Producer in the detail. Submission is blocked by Cast D's missing explicit confirmation. Switch to Cast Member (Cast D) and confirm the selected time, then to Producer and submit. The role selector is a review tool, not an authority-changing product control.
5. Switch to Operator. Approve the move: the confirmed booking moves to Sep 16, the original slot releases, and the replacement hold disappears together. No Publication is changed.
6. Reset and repeat, using Simulate hold expiry, Producer withdrawal, or Operator rejection instead. The original Sep 3 booking remains, and no alternative gets promoted.
7. After approval, simulate required Cast becoming unavailable. The confirmed time remains, marked At risk; a human must resolve it.
8. Reset and move **Program A on Sep 5**. The preview shows staffing, Cast availability, Minimum Viable Cast, Publication consequences, and review. The Rehearsal-specific explicit confirmation gate does not apply to this Performance fixture.
9. Repeat with keyboard and on a phone, then compare A/B/C for scan speed and move comprehension.

## Fixture and assumptions

There are 48 unique items, including eight weekend Performances, Event-linked Rehearsals, standalone Practices, Classes, Workshops, one exclusive tentative hold, a multi-day blackout, a rental reservation, maintenance, and an independent staffing shift. Activity staffing appears in Performance detail rather than duplicate shared entries. There is no separate entry for an Event container. Offsite activities consume no Primary Venue time. No personal names or source screenshot data are included.

STA-59's illustrative Sep 9 request and blackout cannot both occupy the Primary Venue. This fixture places an offsite Rehearsal on Sep 9 and a valid exclusive hold on Sep 15, and tests the blackout as a rejected move target.

The move uses scripted availability (three available, one uncertain) and a separate selected-time confirmation from Cast D; editing a draft invalidates that confirmation. The simulated Performance has a Minimum Viable Cast of three. Other Cast confirmations, staffing coverage, and contacts are fixed fixtures. Buffer length (30 minutes each side), hold deadlines/expiry, public snapshot reconciliation, and authority after submission still need specification. Expiring a held submitted revision discards the simulated pending move and retains the current commitment; whether review survives expiry is a specification question.

Role views demonstrate disclosure boundaries without implementing security. No backend mutation, persistence, real Notification, production calendar query, or schema change is included. The Event-linked Rehearsal and Performance move paths are explored for Ensemble A only. Other activities support scan and detail review. The move preview is a candidate editor rather than drag-and-drop, so click, tap, and keyboard share one explicit review path.

Source decisions: [STA-59](https://linear.app/stagecom/document/sta-59-theater-programming-calendar-decision-4f566f7d5b5e), [STA-61](https://linear.app/stagecom/document/sta-61-rehearsal-request-and-commitment-decision-d2823eeb7d8d), and the [STA-63 question](https://linear.app/stagecom/issue/STA-63/prototype-a-dense-programming-calendar-and-move-flow).

Keep the full prototype on its throwaway branch. The direction below informs a later product specification; it does not promote this code into production.

## Review feedback — September 29, 2026

The reviewer initially likes the Daybook, especially as a general view, and wants the booking contact inside each card. The dense month looks useful for the management team. The resource week is less helpful and its horizontal scrolling is a drawback. All three layouts were hard to judge as an isolated page because the standalone prototype looked unlike STA-64 and the existing site. No layout has been selected; the Daybook and dense month need review in the Theater navigation context.

This revision embeds those two layouts in the STA-64 Theater Calendar and routes Event-linked bookings into the STA-64 Event workspace screen. It does not merge the unrelated September and October fixtures or claim that the calendar work is production-ready.

## Interaction feedback — September 29, 2026

The reviewer found the side sheet difficult to follow and unclear about what a person should do after finding a booking. They want hover details in both Dense month and Daybook, followed by navigation to the relevant Event page when a booking is clicked.

This revision replaces the contextual side sheet with a two-stage interaction. Hover or keyboard focus provides quick details without leaving the Calendar. Activation opens a URL-addressable destination within the Theater journey. Event-linked bookings enter the STA-64 Event workspace with the selected activity, related schedule, viewer-authorized context, and an explicit “What can you do here?” section. Schedule Blocks and standalone activities open corresponding pages with the actions available to that viewer. The existing move exploration now lives in the Event workspace. The standalone prototype retains the same full-page pattern so the interaction can be judged consistently.

## Verification of the first pass

`npm run typecheck`, `npm run build`, scoped ESLint, and `git diff --check` passed. Temporary headless Chromium walkthroughs checked hover and focus previews, URL-addressable Event pages, related-booking navigation, browser Back and Calendar return, blackout and existing-hold conflicts, the Rehearsal confirmation gate, role transitions, original-slot retention, held replacement visibility through submission, approval, expiry, rejection, withdrawal, Performance moves, Member disclosure, three URL layouts, and phone overflow. Browser page errors were absent. Desktop and phone screenshots were visually inspected. These checks verify the demo's interactions; they do not establish usability or production correctness. Production database and authenticated journey suites were not run for this isolated fixture.

## STA-63 review direction — September 29, 2026

The reviewer generally agreed with the revised prototype in the STA-64 Theater context. Carry Daybook and dense month forward as the calendar views to specify: Daybook is the approachable general view, and dense month supports management scanning. Keep booking contact on each card. Resource week remains a comparison in this throwaway prototype, but its horizontal scrolling and limited utility do not justify carrying it into the proposed product direction.

Hover and keyboard focus should reveal a quick-detail card. Activating an Event-linked entry should take the person to that Event workspace with the activity selected so they can inspect related work; a standalone activity or reservation should open its own detail page. Keep the viewer's access boundaries and a clear next action at each destination. The move preview and approval walkthrough demonstrates the STA-59/STA-61 decisions; exact production interactions, persistence, and authorization require a separate implementation specification.
