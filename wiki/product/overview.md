# Product Overview

Documentation status: active

Implementation status: partially implemented

Stagecom is a theater-ops-first SaaS product for improv theaters, comedy theaters, indie venues, and community arts spaces.

The foundation slice helps a theater operator create, preview, and publish a credible public Theater home. The first meaningful product milestone goes further: a Theater Member develops a viable performance Event with a cast and schedule, submits it to management, responds to review, and receives approval before an Owner or Admin publishes it.

## Operational Workspaces Contract

Implementation status: partially implemented

The next product frontier is a personal-first, role-aware operating experience.
Every authenticated person starts at Callsheet, where their personal
commitments remain separate from shared Theater decisions they can resolve.
Entering a Theater is explicit; Theater Operations presents the Operator Work
Queue before watch-only Operational Exceptions, schedule pressure, portfolio,
and activity. There is no role mode: actions state the Theater, Event, and
relationship that make them relevant.

The Theater Calendar defaults to a desktop week/resource view and offers list
and month alternatives with identical authorization and opaque-occupancy
redaction. Personal Calendar is now an agenda/upcoming-first cross-Theater
surface. It lists only a person's upcoming accepted Cast and Event-staff
participation, Producer or Director commitments, and required or optional
Calls. Each entry names its Theater, Event, and relationship, links to its
authorized Event workspace, and never imports unrelated occupancy or opaque
Schedule Blocks. A pending Cast invitation is a phone-first personal
commitment from Callsheet: it gives the recipient the invitation state,
inviter, role, and enough Event summary to accept or decline, without granting
Calls, Candidate Slots, or accepted-Cast details first.

The initial Callsheet projection aggregates pending Cast invitations, pending
Admin Invitations, open required Availability Responses, requested Proposal
edits, pending Counteroffer responses, and upcoming Occurrence Calls across
active Theater memberships. An Owner or Admin can offer Admin authority only
to an active ordinary Member through People; the offer is a Member-labeled
personal commitment, grants no authority before explicit acceptance, and keeps
acceptance or decline factual and notification-derived.
An Owner may remove any current Admin, while an Admin may remove themself or a
peer Admin. That removes only Admin authority: the person remains an active
Theater Member, the Owner relationship is excluded from ordinary Admin
management, and the change is recorded in Theater history with its actor and
time.
Each record keeps its Event relationship separate, states its Theater, Event,
relationship, and relevant timing, and provides an anchored path to the
relevant Event action. Theater selection remains below personal commitments;
shared Theater work is not yet part of this surface.

Authorized Event collaborators now enter a stable Event Overview before the
existing single-scroll controls. The Overview keeps lifecycle, Proposal
decision, Publication, and operational health independent; identifies the
viewer’s current relationships; and gives a deterministic primary action before
relationship-labeled secondary or blocked actions. Its authorized projection
summarizes the next confirmed Occurrence, leadership, participation, requested
staffing, viability, and public status. The section links expose only meaningful
authorized content while Schedule & Plan, Cast & Team, Review, Public Page, and
History continue to reuse the established command surfaces during the staged
migration.

People is available to every active Theater Member. Its Directory discloses
only active display names and Owner/Admin badges. Theater Operators receive
separate Invitations, Access & Roles, and Former Members sections for targeted
admission, reusable join links, narrow capabilities, deactivation, and
historical membership; those private records are never included in the Member
Directory projection.

This contract retains the existing public playbill and calm authenticated
direction. A focused visual-design pass and uncoached Operator validation are
follow-ups. Internal validation plus the published reconciliation opens the
first implementation frontier; neither follow-up is evidence for weakening
navigation, action priority, disclosure, or responsive requirements. See the [operational-workspaces
specification](../../docs/specs/operational-workspaces.md), [actor/state
matrix](../../docs/design/operational-actor-state-matrix.md), and
[validation record](../design/operational-workspaces-validation.md).

## Audience

The rebuild starts with theater owner/admin workflows. Producers, staff, cast, and public visitors are important actors, but the product should first solve theater-level trust, publishing, and coordination.

## What Problem Does Stagecom Solve?

Theater programming is commonly split across forms, spreadsheets, calendars, group messages, ticketing tools, and public websites. Stagecom brings the operational record and the public result into one workflow without turning performers into a generic social network.

## What Is The First Meaningful Win?

A successful milestone journey proves that:

1. An Owner creates and publishes a Theater.
2. Members join through targeted invitations or reusable links.
3. An eligible Producer drafts a performance Event.
4. A Producer and Director assemble a willing, available Proposed Cast.
5. Theater management reviews the schedule and operational commitments.
6. The Event is approved, prepared for publication, and published.
7. An anonymous visitor can view the Event and follow its admission call to action.

## Core Concepts

- Theater: the organization and public identity.
- Event: the continuous programming record from draft through completion or cancellation.
- Occurrence: an Event-specific Rehearsal or Performance.
- Candidate Slot: a possible date, time, and place for an Occurrence.
- Producer: an Event-level proposal, logistics, and public-presentation role.
- Director: an Event-level casting and artistic-participation role.
- Cast: explicit, accepted Event participation by a Theater Member.
- Staff assignment: event-specific operational staffing.

## Product Rules

- Producers are never assumed to be cast.
- Cast membership requires an explicit cast row.
- Producers and Directors are distinct roles, although one person may hold both.
- Owner/Admin controls Theater and Event publication and event staff assignments.
- Operational approval and public publication are separate decisions.
- Scheduling recommendations support human decisions; Stagecom never commits a schedule automatically.
- Public pages expose only published anonymous-safe data.

## What Is Not In The First Meaningful Milestone?

Native Stagecom ticket sales, recurring Event series, open casting calls, guest cast, multiple modeled rooms or venues, committee review, automated application email/SMS, audience analytics, and automated Producer reliability scores are deferred.
