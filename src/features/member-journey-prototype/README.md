# STA-64 Member journey prototype

**Question:** Which low fidelity layout lets a Member find commitments, discover Events and people, enter an Event, distinguish a practice proposal from a confirmed Call, and reach conversation? Can an Operator find shared work in the same structure, including on a phone?

Run `npm run prototype:member-journey` and open `/dev/member-journey-prototype`. The route is independent of login and database state. `?variant=A|B|C&persona=member|multi|operator|leader|pending|former&screen=home|theater|events|event|conversation|people|profile|calendar|operations|public-theater|public-event|public-profile` makes a view shareable. The floating arrows and keyboard left/right arrows switch layouts. The phone button constrains the canvas; the layout also responds to a narrow browser.

The layouts disagree about the first screen's structure:

- **A — Priorities then discovery:** personal responses and Calls lead; explicit Theater entrances sit alongside them; visual Event discovery sits below.
- **B — Daybook:** only personal schedule items follow a dated timeline; discovery and Theater entrances live outside it.
- **C — Theater portal:** visual Theater entrances and destination tiles lead; personal commitments remain in a side rail on desktop.

Suggested uncoached walkthroughs:

1. One-Theater Member: Home → tentative practice proposal → Event → conversation → Maya's profile; return to Home and find the confirmed Friday Call.
2. Multi-Theater Member: find both Theater names on Home and enter Lantern without a role or Theater picker.
3. Operator plus Cast Member: distinguish the personal response from the shared venue/Proposal decision, then enter Operations through Theater navigation.
4. Pending invitee: enter the Event from public discovery and verify that Candidate Slots and conversation remain unavailable until acceptance.
5. Former participant: inspect read-only participation-period conversation; check that later content and posting are unavailable.
6. From the public Theater and published Event, follow the signed-in link into the private Event workspace, and compare the opt-in public profile with the Member profile.
7. Repeat on the phone canvas and use keyboard focus to reach Theater Calendar, Events, People, Operations, and the layout switcher.

The fixture is fictional. Buttons only change in-memory state or the displayed screen. A message does not approve or move a schedule, and an availability response does not confirm a Call. Layout A was selected in the September 29 review; the prototype does not represent shipped capability. Record participant observations and the selected structure in STA-64 before promotion into a specification. Event conversation, profile consent, pre-review holds, and the programming-first Theater home still require specification and production implementation.

Source decisions: STA-60 (information hierarchy), STA-61 (Rehearsal commitments), STA-62 (conversation and profiles), and the STA-58 design map.

## Review feedback and revision 2 — September 29, 2026

The reviewer found the first pass too Theater-centric, with weak multi-Theater identity, near-identical Home/Event/Calendar screens, a timeline mixing unrelated categories, repeated destinations, and no visual identity for Events or people. The liked elements were Home action items and upcoming programming, in-place availability responses, the dated Daybook presentation, Theater coming-up sections, and portal links. No layout was selected.

Revision 2 changes the questions to: can a person recognize their own priorities across Theaters, and does each destination make its scope and next action clear?

- Home is a personal Callsheet, without Theater-scoped navigation. Both Theaters have explicit entrances in the multi-Theater scenario and separate Calls.
- Daybook is a commitments-only timeline. Published Event discovery remains separate.
- Events is a visual portfolio with in-place availability responses; Event detail contains schedule and team context.
- Calendar is a week grid showing venue occupancy, with confirmed bookings, tentative holds, and an unavailable block.
- People is an avatar directory with search; profiles and conversation carry the same illustrated identities.
- Event posters are local SVG illustrations; all avatars and fixtures are fictional placeholders. No network image dependencies.
- Repeated body links are reduced to one main destination per Event card. Theater navigation highlights its current destination.

Avatar-based drag-and-drop casting is a future design consideration from the review, not an interaction implemented or validated here. This revision still needs user review; it does not establish a winning structure or production specifications.

## Selected direction — September 29, 2026

The reviewer selected **A — Priorities then discovery**. Preserve the separate response-needed area, personal commitments, bottom discovery section, and Theater card(s) alongside the personal work.

B was rejected: the timeline idea was appealing earlier, but the resulting design did not work. C was rejected because it felt more cramped than A. Retain both in this throwaway prototype as comparison history.

**Navigation rule:** Home always returns to the person's Callsheet. A Theater landing page is labeled with its actual Theater name, never “Theater home.” Theater navigation names the Theater destination alongside Calendar, Events, and People; the global Home link stays available.

Design for the common one-Theater case first. Multiple Theater memberships remain supported, without making overlap the organizing premise. The reviewer expects overlap to be uncommon; this is design guidance, not measured usage data.

This is a selected prototype direction, not permission to promote the throwaway code into production. The implementation specification and delivery remain separate work.
