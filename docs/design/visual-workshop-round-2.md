# Visual workshop — Availability and Teams

Date: September 30, 2026. Status: runnable exploration; draft spec, not implementation approval.

Confirmed during this round:

- Teams are self-service for Theater Members; ordinary operations should not
  require management intervention. Optional Operator recovery can exist.
- Team Owner is distinct from Theater Owner. The sole remaining Team Member
  becomes Owner after others leave. An Owner leaving while multiple Members remain
  chooses a successor before leaving.
- Availability Responses can be revised until a poll closes.

Prototype links:

- [Member poll](http://localhost:3100/dev/visual-playground?variant=A&screen=callsheet&scenario=member)
- [Producer comparison](http://localhost:3100/dev/visual-playground?variant=A&screen=event&section=Schedule%20%26%20Plan&scenario=producer)
- [Director comparison](http://localhost:3100/dev/visual-playground?variant=A&screen=event&section=Schedule%20%26%20Plan&scenario=director)
- [Directory and self-service Teams](http://localhost:3100/dev/visual-playground?variant=A&screen=people&scenario=member)
- [Team-aware casting](http://localhost:3100/dev/visual-playground?variant=A&screen=event&section=Cast%20%26%20Team&scenario=producer)

Walkthrough: answer all three options, submit, then enter Event Schedule & Plan
and revise. Compare as Producer, preview the venue conflict, choose a viable
planning option, and close the poll. Switch back to the Member; editing is gone,
while submitted responses and confirmed Calls remain separate.

Directory: filter Ants 2 Gods, search Eno and inspect overlapping Team labels.
Create a Team as Noor. Invite Alex; change the lab scenario to Operator + Cast,
open People, select that Team and accept. As Noor, leave the two-person Team;
Alex becomes sole remaining Member and Team Owner. This is simulated across
personas, without sending actual messages or creating real memberships.

Casting: select Ants 2 Gods, then The Management. Austin appears once. Add Eno &
Dan French; Eno’s already pending invitation is excluded. Review the named unique
recipients and confirm individual invitations; nobody becomes accepted Cast.
An Admin with no Event leadership cannot send invitations.

Fixture assumptions: Theater-local Teams; listed Teams visible to active Members;
creator becomes Owner; invitations require consent; Owner manages invitations;
only the poll’s Producer/Director closes it; three immutable candidate options;
submission requires an answer per option. These assumptions are proposals, not
all confirmed policy. They are identified in the draft specification at
`docs/specs/theater-workspace-skeleton-draft.md`.

No real invitation, database, Notification delivery, calendar library, public
credits, Team recovery or migration is implemented. Empty-Team lifecycle and
Operator recovery need review. Poll closure and response
state are in memory. Real authorization and concurrency belong in production
commands and read models, not these components.

## Verification

Typecheck, build and scoped ESLint passed. Temporary Chromium walkthroughs
verified all-option validation, clearing submitted responses, draft/submission
separation, resubmission, poll closure, blocked venue targets, planning-only
selection, Team filters/search, self-service creation, invitation acceptance,
chosen succession and sole-Member ownership, Team selection deduplication,
individual pending Cast invitations and non-leader Operator restriction.
Phone/desktop snapshots and overflow checks covered poll, directory and casting.
No page errors were observed. These are prototype interaction checks, not
production authorization tests or measured usability.
