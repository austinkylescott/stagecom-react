export const operationalConditionClassifications = [
  'personal-commitment',
  'work-queue',
  'operational-exception',
  'notification',
  'calendar-occupancy',
  'ordinary-information',
] as const

export type OperationalConditionClassification =
  (typeof operationalConditionClassifications)[number]

export const operationalSurfaceIds = [
  'callsheet',
  'personal-calendar',
  'theater-operations',
  'theater-events',
  'theater-calendar',
  'people-directory',
  'people-invitations',
  'people-access-and-roles',
  'settings-public-presence',
  'settings-event-policy',
  'settings-venue-and-calendar',
  'settings-ownership-and-security',
  'event-overview',
  'event-schedule-and-plan',
  'event-cast-and-team',
  'event-review',
  'event-public-page',
  'event-history',
  'public-theater',
  'public-event',
] as const

export type OperationalSurfaceId = (typeof operationalSurfaceIds)[number]

export const operationalPersonaIds = [
  'owner',
  'admin',
  'producer',
  'director',
  'cast-member',
  'reviewer',
  'event-staff-member',
  'theater-member',
  'multi-role-person',
  'authenticated-without-theater',
  'public-visitor',
] as const

export type OperationalPersonaId = (typeof operationalPersonaIds)[number]

type OperationalConditionDefinition = {
  authorizedAudience: readonly string[]
  classification: OperationalConditionClassification
  expectedResolution: string
  label: string
  surfaces: readonly OperationalSurfaceId[]
}

function defineOperationalConditions<
  const TConditions extends Record<string, OperationalConditionDefinition>,
>(conditions: TConditions) {
  return conditions
}

/**
 * Canonical projections of seeded domain state. Audience-specific projections
 * are intentionally separate when one underlying state appears differently to
 * different people, so a condition never changes classification by viewer.
 */
export const operationalConditions = defineOperationalConditions({
  'proposal-awaits-review': {
    authorizedAudience: ['Eligible Reviewer', 'eligible Theater Operator'],
    classification: 'work-queue',
    expectedResolution: 'Review the exact submitted Proposal Revision.',
    label: 'Proposal Revision awaits a decision',
    surfaces: ['callsheet', 'theater-operations', 'event-review'],
  },
  'self-authored-proposal-blocked': {
    authorizedAudience: ['Proposal author'],
    classification: 'ordinary-information',
    expectedResolution:
      'Explain that another Reviewer is required; show the Owner override only when configured and eligible.',
    label: 'Another Reviewer is required',
    surfaces: ['event-overview', 'event-review'],
  },
  'owner-self-approval-override-eligible': {
    authorizedAudience: ['Eligible Owner'],
    classification: 'work-queue',
    expectedResolution:
      'Use the configured, separately reasoned, and audited override or wait for another Reviewer.',
    label: 'Owner self-approval override is eligible',
    surfaces: ['callsheet', 'theater-operations', 'event-review'],
  },
  'event-at-risk': {
    authorizedAudience: ['Theater Operator'],
    classification: 'work-queue',
    expectedResolution:
      'Revise, reschedule, allow the risk with a reason, or cancel the Event.',
    label: 'Event is At Risk',
    surfaces: ['callsheet', 'theater-operations', 'event-overview'],
  },
  'producer-cancellation-request': {
    authorizedAudience: ['Theater Operator'],
    classification: 'work-queue',
    expectedResolution: 'Make and record the final cancellation decision.',
    label: 'Producer requests cancellation',
    surfaces: ['callsheet', 'theater-operations', 'event-overview'],
  },
  'event-ready-for-publication': {
    authorizedAudience: ['Theater Operator'],
    classification: 'work-queue',
    expectedResolution: 'Preview and publish the exact eligible snapshot.',
    label: 'Event is ready for Publication',
    surfaces: ['callsheet', 'theater-operations', 'event-public-page'],
  },
  'theater-ready-for-publication': {
    authorizedAudience: ['Theater Operator'],
    classification: 'work-queue',
    expectedResolution:
      'Preview and publish the exact eligible Theater snapshot.',
    label: 'Theater is ready for Publication',
    surfaces: ['callsheet', 'theater-operations', 'settings-public-presence'],
  },
  'producer-public-content-incomplete': {
    authorizedAudience: ['Producer'],
    classification: 'personal-commitment',
    expectedResolution:
      'Complete the Event public content and admission details.',
    label: 'Public content needs completion',
    surfaces: ['callsheet', 'event-overview', 'event-public-page'],
  },
  'operator-observes-missing-public-content': {
    authorizedAudience: ['Theater Operator'],
    classification: 'operational-exception',
    expectedResolution:
      'Monitor Producer-owned progress; do not expose a premature Publication action.',
    label: 'Approved Event is waiting on Producer-owned public content',
    surfaces: ['theater-operations', 'event-overview', 'event-public-page'],
  },
  'required-event-staff-unfilled': {
    authorizedAudience: ['Theater Operator'],
    classification: 'work-queue',
    expectedResolution:
      'Invite an eligible Theater Member; keep the need unresolved until acceptance.',
    label: 'Required Event staff need is unfilled',
    surfaces: ['callsheet', 'theater-operations', 'event-cast-and-team'],
  },
  'cast-invitation-awaits-response': {
    authorizedAudience: ['Invited Cast Member'],
    classification: 'personal-commitment',
    expectedResolution: 'Accept or decline the Cast invitation.',
    label: 'Cast invitation awaits response',
    surfaces: ['callsheet', 'event-overview', 'event-cast-and-team'],
  },
  'staff-assignment-awaits-response': {
    authorizedAudience: ['Invited Event staff member'],
    classification: 'personal-commitment',
    expectedResolution: 'Accept or decline the Event Staff Assignment.',
    label: 'Event Staff Assignment awaits response',
    surfaces: ['callsheet', 'event-overview', 'event-cast-and-team'],
  },
  'producer-plan-needs-work': {
    authorizedAudience: ['Producer'],
    classification: 'personal-commitment',
    expectedResolution:
      'Complete the operational plan before submitting a Proposal Revision.',
    label: 'Event plan needs Producer work',
    surfaces: ['callsheet', 'event-overview', 'event-schedule-and-plan'],
  },
  'proposal-edits-requested': {
    authorizedAudience: ['Producer'],
    classification: 'personal-commitment',
    expectedResolution:
      'Address the requested changes and submit a new immutable Proposal Revision.',
    label: 'Proposal Revision changes were requested',
    surfaces: ['callsheet', 'event-overview', 'event-review'],
  },
  'director-cast-plan-needs-work': {
    authorizedAudience: ['Director'],
    classification: 'personal-commitment',
    expectedResolution:
      'Invite Cast Members and establish a viable Proposed Cast.',
    label: 'Cast plan needs Director work',
    surfaces: ['callsheet', 'event-overview', 'event-cast-and-team'],
  },
  'availability-response-required': {
    authorizedAudience: ['Called participant'],
    classification: 'personal-commitment',
    expectedResolution: 'Respond available, unavailable, or uncertain.',
    label: 'Candidate Slot needs an Availability Response',
    surfaces: ['callsheet', 'event-overview', 'event-schedule-and-plan'],
  },
  'occurrence-call-needs-review': {
    authorizedAudience: ['Called Cast Member', 'called Event staff member'],
    classification: 'personal-commitment',
    expectedResolution:
      'Review the required, optional, or not-called expectation.',
    label: 'Upcoming Occurrence Call needs review',
    surfaces: ['callsheet', 'event-overview'],
  },
  'counteroffer-awaits-producer': {
    authorizedAudience: ['Producer'],
    classification: 'personal-commitment',
    expectedResolution: 'Accept or decline the Counteroffer before expiry.',
    label: 'Counteroffer awaits Producer response',
    surfaces: ['callsheet', 'event-overview', 'event-review'],
  },
  'counteroffer-nears-expiry': {
    authorizedAudience: ['Producer', 'Reviewer', 'Theater Operator'],
    classification: 'operational-exception',
    expectedResolution:
      'Monitor the expiry or take an available domain action; do not present a false Operator decision.',
    label: 'Counteroffer approaches expiry',
    surfaces: ['callsheet', 'theater-operations', 'event-review'],
  },
  'temporary-hold-nears-expiry': {
    authorizedAudience: ['Producer', 'Reviewer', 'Theater Operator'],
    classification: 'operational-exception',
    expectedResolution:
      'Monitor the hold or take an available domain action before it expires.',
    label: 'Temporary hold approaches expiry',
    surfaces: ['theater-operations', 'theater-calendar', 'event-review'],
  },
  'admin-invitation-awaits-response': {
    authorizedAudience: ['Invited Theater Member'],
    classification: 'personal-commitment',
    expectedResolution: 'Accept or decline Admin authority.',
    label: 'Admin Invitation awaits response',
    surfaces: ['callsheet', 'people-access-and-roles'],
  },
  'ownership-transfer-awaits-response': {
    authorizedAudience: ['Proposed successor'],
    classification: 'personal-commitment',
    expectedResolution: 'Accept or decline ownership transfer.',
    label: 'Ownership transfer awaits response',
    surfaces: ['callsheet', 'settings-ownership-and-security'],
  },
  'automatic-completion-succeeded': {
    authorizedAudience: ['Theater Operator', 'involved Event collaborator'],
    classification: 'ordinary-information',
    expectedResolution: 'No action; inspect factual Event History if needed.',
    label: 'Event completed after its final Confirmed Slot',
    surfaces: ['event-overview', 'event-history'],
  },
  'automatic-completion-failed': {
    authorizedAudience: ['Theater Operator'],
    classification: 'operational-exception',
    expectedResolution: 'Investigate why safe automatic completion failed.',
    label: 'Event could not complete automatically',
    surfaces: ['theater-operations', 'event-overview', 'event-history'],
  },
  'cast-invitation-notification': {
    authorizedAudience: ['Invited Cast Member'],
    classification: 'notification',
    expectedResolution:
      'Read or dismiss the alert without changing the invitation state.',
    label: 'Cast invitation received',
    surfaces: ['callsheet'],
  },
  'proposal-submitted-notification': {
    authorizedAudience: ['Eligible Reviewer'],
    classification: 'notification',
    expectedResolution:
      'Read or dismiss the alert without changing the Proposal Revision.',
    label: 'Proposal Revision submitted',
    surfaces: ['callsheet'],
  },
  'staff-assignment-notification': {
    authorizedAudience: ['Invited Event staff member'],
    classification: 'notification',
    expectedResolution:
      'Read or dismiss the alert without changing the assignment state.',
    label: 'Event Staff Assignment offered',
    surfaces: ['callsheet'],
  },
  'counteroffer-notification': {
    authorizedAudience: ['Producer'],
    classification: 'notification',
    expectedResolution:
      'Read or dismiss the alert without changing the Counteroffer state.',
    label: 'Counteroffer issued',
    surfaces: ['callsheet'],
  },
  'ownership-transfer-notification': {
    authorizedAudience: ['Proposed successor'],
    classification: 'notification',
    expectedResolution:
      'Read or dismiss the alert without changing the ownership transfer.',
    label: 'Ownership transfer proposed',
    surfaces: ['callsheet'],
  },
  'admin-invitation-notification': {
    authorizedAudience: ['Invited Theater Member'],
    classification: 'notification',
    expectedResolution:
      'Read or dismiss the alert without changing the Admin Invitation.',
    label: 'Admin Invitation received',
    surfaces: ['callsheet'],
  },
  'personal-occurrence-call': {
    authorizedAudience: ['Called Cast Member', 'called Event staff member'],
    classification: 'calendar-occupancy',
    expectedResolution: 'Review the Call and prepare for the Occurrence.',
    label: 'Personal Occurrence Call',
    surfaces: ['callsheet', 'personal-calendar', 'event-overview'],
  },
  'personal-event-commitment': {
    authorizedAudience: ['Producer', 'Director', 'accepted Cast Member'],
    classification: 'calendar-occupancy',
    expectedResolution: 'Review the Event and its next relevant Occurrence.',
    label: 'Personal Event commitment',
    surfaces: ['callsheet', 'personal-calendar', 'event-overview'],
  },
  'authorized-event-occupancy': {
    authorizedAudience: ['Involved Event collaborator', 'Theater Operator'],
    classification: 'calendar-occupancy',
    expectedResolution: 'Open the authorized Event or Occurrence detail.',
    label: 'Authorized Event occupancy',
    surfaces: ['theater-calendar', 'event-overview'],
  },
  'opaque-primary-venue-occupancy': {
    authorizedAudience: ['Active uninvolved Theater Member'],
    classification: 'calendar-occupancy',
    expectedResolution: 'Use the time and resource availability only.',
    label: 'Primary Venue unavailable',
    surfaces: ['theater-calendar'],
  },
  'operator-schedule-block': {
    authorizedAudience: ['Theater Operator'],
    classification: 'calendar-occupancy',
    expectedResolution: 'Inspect or manage the Schedule Block when authorized.',
    label: 'Primary Venue maintenance',
    surfaces: ['theater-calendar', 'settings-venue-and-calendar'],
  },
  'cross-theater-membership-summary': {
    authorizedAudience: ['Authenticated person'],
    classification: 'ordinary-information',
    expectedResolution:
      'Enter a Theater when Theater-scoped context is needed.',
    label: 'Current Theater memberships',
    surfaces: ['callsheet'],
  },
  'operator-event-pipeline': {
    authorizedAudience: ['Theater Operator'],
    classification: 'ordinary-information',
    expectedResolution: 'Filter or open an Event for deeper context.',
    label: 'Event pipeline summary',
    surfaces: ['theater-operations', 'theater-events'],
  },
  'active-member-directory': {
    authorizedAudience: ['Active Theater Member'],
    classification: 'ordinary-information',
    expectedResolution: 'Identify Theater Members, Owner, and Admins.',
    label: 'Active Theater Member directory',
    surfaces: ['people-directory'],
  },
  'revoked-admin-remains-member': {
    authorizedAudience: ['Former Admin who remains a Theater Member'],
    classification: 'ordinary-information',
    expectedResolution:
      'Return to Member-visible destinations; removed Admin access is effective immediately.',
    label: 'Admin authority was removed',
    surfaces: ['callsheet', 'people-directory'],
  },
  'authorized-event-summary': {
    authorizedAudience: ['Authorized Event collaborator'],
    classification: 'ordinary-information',
    expectedResolution:
      'Review independent Event states and relationship summary.',
    label: 'Authorized Event summary',
    surfaces: ['event-overview'],
  },
  'accepted-staff-responsibility': {
    authorizedAudience: ['Accepted Event staff member'],
    classification: 'ordinary-information',
    expectedResolution:
      'Review the assigned responsibility, logistics, and selected Occurrence Calls.',
    label: 'Accepted Event Staff Assignment',
    surfaces: ['event-overview', 'event-cast-and-team'],
  },
  'staff-assignment-offer-summary': {
    authorizedAudience: ['Invited Event staff member'],
    classification: 'ordinary-information',
    expectedResolution:
      'Use the responsibility and necessary Event summary to decide the assignment.',
    label: 'Proposed Event Staff Assignment',
    surfaces: ['event-overview', 'event-cast-and-team'],
  },
  'owner-governance-summary': {
    authorizedAudience: ['Owner'],
    classification: 'ordinary-information',
    expectedResolution:
      'Manage Admin authority or propose ownership transfer when needed.',
    label: 'Theater ownership and Admin authority',
    surfaces: ['people-access-and-roles', 'settings-ownership-and-security'],
  },
  'published-event-summary': {
    authorizedAudience: ['Anyone'],
    classification: 'ordinary-information',
    expectedResolution: 'Open the canonical published Event page.',
    label: 'Upcoming published Event',
    surfaces: ['theater-events', 'public-theater', 'public-event'],
  },
  'published-event-cancelled': {
    authorizedAudience: ['Public visitor'],
    classification: 'ordinary-information',
    expectedResolution:
      'Keep the Event discoverable and clearly cancelled until its final scheduled Performance passes.',
    label: 'Published Event cancelled',
    surfaces: ['public-theater', 'public-event'],
  },
  'no-theater-membership': {
    authorizedAudience: ['Authenticated person without Theater scope'],
    classification: 'ordinary-information',
    expectedResolution:
      'Create a Theater or join one with an invitation or link.',
    label: 'No current Theater membership',
    surfaces: ['callsheet'],
  },
})

export type OperationalConditionId = keyof typeof operationalConditions

type ConditionIdFor<
  TClassification extends OperationalConditionClassification,
> = {
  [
    Id in OperationalConditionId
  ]: (typeof operationalConditions)[Id]['classification'] extends TClassification
    ? Id
    : never
}[OperationalConditionId]

export type ScenarioConditionMatrix = {
  readonly [
    Classification in OperationalConditionClassification
  ]: readonly ConditionIdFor<Classification>[]
}

export type ScenarioAction = {
  conditionId?: OperationalConditionId
  destination: OperationalSurfaceId
  label: string
  relationshipLabel: string
}

export type OperationalScenario = {
  allowedStartingSurfaces: readonly ('callsheet' | 'public-theater')[]
  alternateOutcomes?: readonly string[]
  calendarDisclosure: {
    personalCalendar: string
    theaterCalendar: string
  }
  conditions: ScenarioConditionMatrix
  forbiddenDisclosures: readonly string[]
  id: string
  navigationPath: readonly OperationalSurfaceId[]
  personas: readonly OperationalPersonaId[]
  primaryAction: ScenarioAction
  primaryViewport: 'desktop' | 'phone'
  relationshipLabels: readonly string[]
  relevantScope: readonly string[]
  secondaryActions: readonly ScenarioAction[]
  title: string
  visibleInformation: readonly string[]
}

function defineOperationalScenarios<
  const TScenarios extends readonly OperationalScenario[],
>(scenarios: TScenarios) {
  return scenarios
}

/**
 * Stable seed contract for the operational-workspaces prototype and the later
 * acceptance journey. Consumers may add rendering or persistence adapters, but
 * must not reinterpret classifications, disclosure, priority, or navigation.
 */
export const operationalScenarios = defineOperationalScenarios([
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows only the Owner’s own Event commitments and Occurrence Calls across Theaters.',
      theaterCalendar:
        'Shows Event, Occurrence, hold, and Schedule Block detail for Lantern Theater.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': [
        'event-at-risk',
        'producer-cancellation-request',
        'proposal-awaits-review',
        'event-ready-for-publication',
        'theater-ready-for-publication',
        'owner-self-approval-override-eligible',
      ],
      'operational-exception': [
        'operator-observes-missing-public-content',
        'temporary-hold-nears-expiry',
        'automatic-completion-failed',
      ],
      notification: ['proposal-submitted-notification'],
      'calendar-occupancy': [
        'authorized-event-occupancy',
        'operator-schedule-block',
      ],
      'ordinary-information': [
        'cross-theater-membership-summary',
        'operator-event-pipeline',
        'active-member-directory',
        'authorized-event-summary',
        'owner-governance-summary',
        'automatic-completion-succeeded',
        'self-authored-proposal-blocked',
      ],
    },
    forbiddenDisclosures: [
      'Another person’s personal Notification read or dismissed state',
      'Private Event details from a Theater where the person has no relationship',
      'Any control that changes the Owner outside the ownership-transfer flow',
    ],
    id: 'owner-operator-pressure',
    navigationPath: ['callsheet', 'theater-operations', 'event-overview'],
    personas: ['owner'],
    primaryViewport: 'desktop',
    primaryAction: {
      conditionId: 'event-at-risk',
      destination: 'event-overview',
      label: 'Resolve The Glass Menagerie’s At Risk state',
      relationshipLabel: 'Lantern Theater · Owner',
    },
    relationshipLabels: ['Owner', 'Theater Operator'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'Lantern Theater Operations',
      'The Glass Menagerie Event',
    ],
    secondaryActions: [
      {
        conditionId: 'producer-cancellation-request',
        destination: 'event-overview',
        label: 'Decide the cancellation request for Night Music',
        relationshipLabel: 'Lantern Theater · Owner',
      },
      {
        conditionId: 'proposal-awaits-review',
        destination: 'event-review',
        label: 'Review The Tempest Proposal Revision 3',
        relationshipLabel: 'Lantern Theater · eligible Owner',
      },
      {
        conditionId: 'event-ready-for-publication',
        destination: 'event-public-page',
        label: 'Preview and publish The Winter’s Tale',
        relationshipLabel: 'Lantern Theater · Owner',
      },
      {
        conditionId: 'theater-ready-for-publication',
        destination: 'settings-public-presence',
        label: 'Preview and publish Lantern Theater',
        relationshipLabel: 'Lantern Theater · Owner',
      },
      {
        conditionId: 'owner-self-approval-override-eligible',
        destination: 'event-review',
        label:
          'Use the eligible, reasoned override for The Seagull Proposal Revision 1',
        relationshipLabel:
          'Lantern Theater · The Seagull · eligible Owner and Proposal author',
      },
      {
        conditionId: 'owner-governance-summary',
        destination: 'settings-ownership-and-security',
        label: 'Manage Admins or propose ownership transfer',
        relationshipLabel: 'Lantern Theater · Owner',
      },
    ],
    title: 'Owner triages Theater-wide operational pressure',
    visibleInformation: [
      'Explainable Work Queue priority and urgent Operational Exceptions',
      'Independent Event lifecycle, Proposal, Publication, and health states',
      'Upcoming Primary Venue pressure and recent factual activity',
      'Owner-only sovereignty actions separated from ordinary operations',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows only the Admin’s own accepted commitments, not all Theater occupancy.',
      theaterCalendar:
        'Shows full authorized Lantern Theater occupancy, including the maintenance Schedule Block.',
    },
    conditions: {
      'personal-commitment': ['ownership-transfer-awaits-response'],
      'work-queue': [
        'required-event-staff-unfilled',
        'proposal-awaits-review',
        'event-at-risk',
      ],
      'operational-exception': [
        'temporary-hold-nears-expiry',
        'operator-observes-missing-public-content',
      ],
      notification: ['ownership-transfer-notification'],
      'calendar-occupancy': [
        'authorized-event-occupancy',
        'operator-schedule-block',
      ],
      'ordinary-information': [
        'cross-theater-membership-summary',
        'operator-event-pipeline',
        'active-member-directory',
      ],
    },
    forbiddenDisclosures: [
      'Owner-only self-approval override',
      'Ownership transfer initiation or other Owner-only sovereignty controls',
      'Private information from Events outside the Admin’s Theater authority',
    ],
    id: 'admin-staffing-calendar-and-successorship',
    alternateOutcomes: [
      'Decline the ownership transfer; the current Owner retains authority.',
    ],
    navigationPath: ['callsheet'],
    personas: ['admin'],
    primaryViewport: 'desktop',
    primaryAction: {
      conditionId: 'ownership-transfer-awaits-response',
      destination: 'callsheet',
      label: 'Accept or decline ownership of Lantern Theater',
      relationshipLabel: 'Lantern Theater · proposed successor',
    },
    relationshipLabels: ['Admin', 'Theater Operator', 'Proposed successor'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'Lantern Theater Operations',
      'Lantern Theater People and Calendar',
    ],
    secondaryActions: [
      {
        conditionId: 'required-event-staff-unfilled',
        destination: 'event-cast-and-team',
        label: 'Invite a stage manager for The Tempest',
        relationshipLabel: 'Lantern Theater · Admin',
      },
      {
        conditionId: 'operator-schedule-block',
        destination: 'theater-calendar',
        label: 'Inspect the Primary Venue maintenance block',
        relationshipLabel: 'Lantern Theater · Admin',
      },
      {
        destination: 'people-access-and-roles',
        label: 'Invite or remove a peer Admin',
        relationshipLabel: 'Lantern Theater · Admin',
      },
    ],
    title: 'Admin balances personal successorship with shared operations',
    visibleInformation: [
      'Personal ownership-transfer commitment above shared Theater work',
      'Staffing coverage that remains unresolved until acceptance',
      'Full Calendar detail for the Theater the Admin operates',
      'Directory, invitations, access, and roles without Owner-only controls',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows the Producer’s Events and relevant committed Occurrences across Theaters.',
      theaterCalendar:
        'Shows details for Events the Producer leads and opaque occupancy for unrelated private Events.',
    },
    conditions: {
      'personal-commitment': [
        'counteroffer-awaits-producer',
        'producer-public-content-incomplete',
        'producer-plan-needs-work',
        'proposal-edits-requested',
      ],
      'work-queue': [],
      'operational-exception': ['counteroffer-nears-expiry'],
      notification: ['counteroffer-notification'],
      'calendar-occupancy': [
        'personal-event-commitment',
        'authorized-event-occupancy',
        'opaque-primary-venue-occupancy',
      ],
      'ordinary-information': [
        'cross-theater-membership-summary',
        'authorized-event-summary',
      ],
    },
    forbiddenDisclosures: [
      'Theater Operator Work Queue items the Producer cannot resolve',
      'Reviewer deliberation or another Reviewer’s private rationale',
      'Private titles and details for unrelated Calendar occupancy',
    ],
    id: 'producer-counteroffer-and-public-content',
    alternateOutcomes: [
      'Decline the Counteroffer before expiry.',
      'Encounter a stale or expired Counteroffer and recover without a dead end.',
    ],
    navigationPath: ['callsheet', 'event-overview', 'event-review'],
    personas: ['producer'],
    primaryViewport: 'desktop',
    primaryAction: {
      conditionId: 'counteroffer-awaits-producer',
      destination: 'event-review',
      label: 'Respond to The Tempest Counteroffer before it expires',
      relationshipLabel: 'Lantern Theater · The Tempest · Producer',
    },
    relationshipLabels: ['Producer'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The Tempest Event workspace',
      'The Tempest Calendar context',
    ],
    secondaryActions: [
      {
        conditionId: 'producer-public-content-incomplete',
        destination: 'event-public-page',
        label: 'Complete public content for Night Music',
        relationshipLabel: 'Harbor Players · Night Music · Producer',
      },
      {
        conditionId: 'producer-plan-needs-work',
        destination: 'event-schedule-and-plan',
        label: 'Complete the operational plan for The Tempest',
        relationshipLabel: 'Lantern Theater · The Tempest · Producer',
      },
      {
        conditionId: 'proposal-edits-requested',
        destination: 'event-review',
        label: 'Address requested edits for Night Music Proposal Revision 2',
        relationshipLabel: 'Harbor Players · Night Music · Producer',
      },
    ],
    title:
      'Producer resolves plan, requested edits, Counteroffer, and public-content work',
    visibleInformation: [
      'Independent Proposal, schedule, operational, and Publication state for led Events',
      'Counteroffer expiry and temporary-hold context',
      'Producer-owned public-content blockers',
      'Relationship labels on every cross-Theater commitment',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows the Director’s Events and next relevant committed Occurrences.',
      theaterCalendar:
        'Shows details for directed Events and opaque occupancy for unrelated private Events.',
    },
    conditions: {
      'personal-commitment': ['director-cast-plan-needs-work'],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': [
        'personal-event-commitment',
        'authorized-event-occupancy',
        'opaque-primary-venue-occupancy',
      ],
      'ordinary-information': ['authorized-event-summary'],
    },
    forbiddenDisclosures: [
      'Theater Operator controls and shared Work Queue',
      'Proposal decision controls unless a separate Reviewer relationship grants them',
      'Private Schedule Block labels, notes, and creator identity',
    ],
    id: 'director-cast-and-participation',
    navigationPath: ['callsheet', 'event-overview', 'event-cast-and-team'],
    personas: ['director'],
    primaryViewport: 'desktop',
    primaryAction: {
      conditionId: 'director-cast-plan-needs-work',
      destination: 'event-cast-and-team',
      label: 'Invite Cast and complete The Tempest Proposed Cast',
      relationshipLabel: 'Lantern Theater · The Tempest · Director',
    },
    relationshipLabels: ['Director'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The Tempest Event workspace',
      'Authorized Cast and participation information',
    ],
    secondaryActions: [
      {
        destination: 'event-schedule-and-plan',
        label: 'Review Availability Responses for Candidate Slots',
        relationshipLabel: 'Lantern Theater · The Tempest · Director',
      },
      {
        destination: 'event-cast-and-team',
        label: 'Assign required and optional Occurrence Calls',
        relationshipLabel: 'Lantern Theater · The Tempest · Director',
      },
    ],
    title: 'Director coordinates Cast and participation',
    visibleInformation: [
      'Accepted and invited Cast needed to build the Proposed Cast',
      'Availability Responses for authorized Candidate Slots',
      'Occurrence Call assignments for the Event',
      'No role switcher between personal and Event context',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Adds no Event commitment or Call before the invitation is accepted.',
      theaterCalendar:
        'Retains base-Member opaque occupancy until Cast participation is accepted.',
    },
    conditions: {
      'personal-commitment': ['cast-invitation-awaits-response'],
      'work-queue': [],
      'operational-exception': [],
      notification: ['cast-invitation-notification'],
      'calendar-occupancy': ['opaque-primary-venue-occupancy'],
      'ordinary-information': [],
    },
    forbiddenDisclosures: [
      'Other Cast Members’ private Availability Responses',
      'Candidate Slots, Calls, and accepted-Cast information before acceptance',
      'Internal Proposal review controls and deliberation',
      'Unrelated private Event and Schedule Block details',
    ],
    id: 'cast-invitation-awaits-theater-member',
    alternateOutcomes: [
      'Decline the Cast invitation and retain ordinary Theater membership.',
    ],
    navigationPath: ['callsheet', 'event-overview', 'event-cast-and-team'],
    personas: ['theater-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'cast-invitation-awaits-response',
      destination: 'event-cast-and-team',
      label: 'Accept or decline The Tempest Cast invitation',
      relationshipLabel: 'Lantern Theater · The Tempest · invited Cast Member',
    },
    relationshipLabels: ['Theater Member', 'Invited Cast Member'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The Tempest Cast invitation preview',
      'Member-level Calendar disclosure before acceptance',
    ],
    secondaryActions: [
      {
        conditionId: 'cast-invitation-awaits-response',
        destination: 'event-overview',
        label: 'Review the Event summary included with the invitation',
        relationshipLabel:
          'Lantern Theater · The Tempest · invited Cast Member',
      },
    ],
    title: 'Theater Member decides a Cast invitation',
    visibleInformation: [
      'Invitation state, inviter, role, and enough Event summary to decide',
      'No Cast membership before explicit acceptance',
      'The effect of accepting or declining participation',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows accepted Event participation and the Cast Member’s required and optional Calls.',
      theaterCalendar:
        'Shows full detail for the Cast Member’s Event and opaque occupancy for unrelated private Events.',
    },
    conditions: {
      'personal-commitment': [
        'availability-response-required',
        'occurrence-call-needs-review',
      ],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': [
        'personal-event-commitment',
        'personal-occurrence-call',
        'authorized-event-occupancy',
      ],
      'ordinary-information': ['authorized-event-summary'],
    },
    forbiddenDisclosures: [
      'Other Cast Members’ private Availability Responses',
      'Internal Proposal review controls and deliberation',
      'Unrelated private Event and Schedule Block details',
    ],
    id: 'accepted-cast-availability-calls-and-withdrawal',
    navigationPath: ['callsheet', 'event-overview', 'event-schedule-and-plan'],
    personas: ['cast-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'availability-response-required',
      destination: 'event-schedule-and-plan',
      label: 'Respond to The Tempest first-rehearsal Candidate Slots',
      relationshipLabel: 'Lantern Theater · The Tempest · Cast Member',
    },
    relationshipLabels: ['Cast Member'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The Tempest Event summary and authorized Cast information',
      'Personal Calendar and called Occurrences',
    ],
    secondaryActions: [
      {
        conditionId: 'personal-occurrence-call',
        destination: 'personal-calendar',
        label: 'Review The Tempest’s next required rehearsal Call',
        relationshipLabel: 'Lantern Theater · The Tempest · Cast Member',
      },
      {
        destination: 'event-cast-and-team',
        label: 'Withdraw from The Tempest when participation cannot continue',
        relationshipLabel: 'Lantern Theater · The Tempest · Cast Member',
      },
    ],
    title: 'Accepted Cast Member manages availability, Calls, and withdrawal',
    visibleInformation: [
      'Authorized Event summary and role-appropriate Cast information',
      'Only Candidate Slots that require this person’s response',
      'Personal required, optional, and not-called participation',
      'A truthful withdrawal action with its operational consequences',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Does not invent an Occurrence Call or personal commitment merely because the person is a Reviewer.',
      theaterCalendar:
        'Shows Event detail needed for the reviewed Proposal and opaque unrelated occupancy.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': ['proposal-awaits-review'],
      'operational-exception': ['temporary-hold-nears-expiry'],
      notification: ['proposal-submitted-notification'],
      'calendar-occupancy': [
        'authorized-event-occupancy',
        'opaque-primary-venue-occupancy',
      ],
      'ordinary-information': ['authorized-event-summary'],
    },
    forbiddenDisclosures: [
      'Unrelated Theater administration or People access controls',
      'A self-approval action when the Reviewer authored the Proposal',
      'Private Event information beyond what is required to decide the exact revision',
    ],
    id: 'designated-reviewer-exact-revision',
    navigationPath: ['callsheet', 'event-overview', 'event-review'],
    personas: ['reviewer'],
    primaryViewport: 'desktop',
    primaryAction: {
      conditionId: 'proposal-awaits-review',
      destination: 'event-review',
      label: 'Decide The Tempest Proposal Revision 3',
      relationshipLabel: 'Lantern Theater · The Tempest · designated Reviewer',
    },
    relationshipLabels: ['Reviewer'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The exact submitted Proposal Revision',
      'Authorized Event review context',
    ],
    secondaryActions: [
      {
        conditionId: 'temporary-hold-nears-expiry',
        destination: 'event-review',
        label: 'Inspect the Counteroffer hold approaching expiry',
        relationshipLabel: 'Lantern Theater · The Tempest · Reviewer',
      },
      {
        destination: 'event-review',
        label: 'Approve, request edits, deny, or issue a Counteroffer',
        relationshipLabel: 'Lantern Theater · The Tempest · Reviewer',
      },
    ],
    title: 'Designated Reviewer decides an exact Proposal Revision',
    visibleInformation: [
      'Immutable submitted revision and decision eligibility',
      'Schedule and viability evidence required for the decision',
      'Counteroffer and temporary-hold expiry context',
      'No unrelated Admin authority',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Adds no Event commitment or Call before the assignment is accepted.',
      theaterCalendar:
        'Retains base-Member opaque occupancy until the assignment is accepted.',
    },
    conditions: {
      'personal-commitment': ['staff-assignment-awaits-response'],
      'work-queue': [],
      'operational-exception': [],
      notification: ['staff-assignment-notification'],
      'calendar-occupancy': ['opaque-primary-venue-occupancy'],
      'ordinary-information': ['staff-assignment-offer-summary'],
    },
    forbiddenDisclosures: [
      'Automatic Cast membership or Cast-only participation detail',
      'Assigned Occurrences, Calls, and accepted responsibility before acceptance',
      'Occurrences to which the staff member is not assigned or called',
      'Proposal review, Publication, and Theater administration controls',
    ],
    id: 'staff-assignment-awaits-theater-member',
    alternateOutcomes: [
      'Decline the Event Staff Assignment; the staffing need returns to unresolved.',
    ],
    navigationPath: ['callsheet', 'event-overview', 'event-cast-and-team'],
    personas: ['theater-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'staff-assignment-awaits-response',
      destination: 'event-cast-and-team',
      label: 'Accept or decline The Tempest stage manager assignment',
      relationshipLabel:
        'Lantern Theater · The Tempest · invited Event staff member',
    },
    relationshipLabels: ['Theater Member', 'Invited Event staff member'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The Tempest assignment offer and necessary Event summary',
      'Member-level Calendar disclosure before acceptance',
    ],
    secondaryActions: [
      {
        conditionId: 'staff-assignment-offer-summary',
        destination: 'event-overview',
        label: 'Review the proposed responsibility and necessary Event summary',
        relationshipLabel:
          'Lantern Theater · The Tempest · invited Event staff member',
      },
    ],
    title: 'Theater Member decides an Event Staff Assignment',
    visibleInformation: [
      'Assignment responsibility, inviter, and response state',
      'Enough Event summary to decide without accepted-only logistics',
      'No Event staff relationship before explicit acceptance',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows only accepted Event Staff Assignments and selected Occurrence Calls.',
      theaterCalendar:
        'Shows Event detail needed for the assignment and opaque unrelated occupancy.',
    },
    conditions: {
      'personal-commitment': ['occurrence-call-needs-review'],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': [
        'personal-occurrence-call',
        'authorized-event-occupancy',
      ],
      'ordinary-information': [
        'authorized-event-summary',
        'accepted-staff-responsibility',
      ],
    },
    forbiddenDisclosures: [
      'Automatic Cast membership or Cast-only participation detail',
      'Occurrences to which the staff member is not assigned or called',
      'Proposal review, Publication, and Theater administration controls',
    ],
    id: 'accepted-event-staff-responsibility-and-calls',
    navigationPath: ['callsheet', 'event-overview'],
    personas: ['event-staff-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'occurrence-call-needs-review',
      destination: 'event-overview',
      label: 'Review The Tempest’s first technical rehearsal Call',
      relationshipLabel: 'Lantern Theater · The Tempest · stage manager',
    },
    relationshipLabels: ['Event staff member', 'Stage manager'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'The Tempest summary and scoped Cast & Team information',
      'Assigned logistics and Occurrence Calls',
    ],
    secondaryActions: [
      {
        conditionId: 'personal-occurrence-call',
        destination: 'personal-calendar',
        label: 'Open The Tempest’s first technical rehearsal occupancy',
        relationshipLabel: 'Lantern Theater · The Tempest · stage manager',
      },
      {
        conditionId: 'accepted-staff-responsibility',
        destination: 'event-cast-and-team',
        label: 'Review The Tempest stage manager responsibility and logistics',
        relationshipLabel: 'Lantern Theater · The Tempest · stage manager',
      },
    ],
    title: 'Accepted Event staff member fulfills bounded responsibility',
    visibleInformation: [
      'Accepted assignment responsibility and necessary Event summary',
      'Only assigned Occurrences, Calls, and necessary logistics',
      'Staff relationship kept separate from Cast membership',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows no unrelated Theater occupancy when the Member has no personal Event commitment.',
      theaterCalendar:
        'Shows time, resource, and “Primary Venue unavailable” for unauthorized occupancy.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': ['opaque-primary-venue-occupancy'],
      'ordinary-information': [
        'cross-theater-membership-summary',
        'active-member-directory',
        'published-event-summary',
      ],
    },
    forbiddenDisclosures: [
      'Private Event title, people, lifecycle, Proposal, or blocker link behind opaque occupancy',
      'Schedule Block label, notes, creator, or history',
      'Member contact details, narrow capabilities, and access history',
      'People invitations, access controls, Settings, and Theater Operations',
    ],
    id: 'base-member-calendar-and-people',
    navigationPath: ['callsheet', 'theater-calendar'],
    personas: ['theater-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'opaque-primary-venue-occupancy',
      destination: 'theater-calendar',
      label: 'Check when the Primary Venue is available',
      relationshipLabel: 'Lantern Theater · Theater Member',
    },
    relationshipLabels: ['Theater Member'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'Lantern Theater Calendar',
      'Lantern Theater Events and People directory',
    ],
    secondaryActions: [
      {
        conditionId: 'active-member-directory',
        destination: 'people-directory',
        label: 'Identify Theater Members and Operators',
        relationshipLabel: 'Lantern Theater · Theater Member',
      },
      {
        conditionId: 'published-event-summary',
        destination: 'theater-events',
        label: 'Browse published and personally related Events',
        relationshipLabel: 'Lantern Theater · Theater Member',
      },
    ],
    title: 'Base Theater Member plans without private disclosure',
    visibleInformation: [
      'Published Events and Events with a direct relationship',
      'Active Theater Member names and visible Owner/Admin labels',
      'Opaque Primary Venue occupancy for unrelated private work',
      'Stable read-only navigation without administrative destinations',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    alternateOutcomes: [
      'Decline the Admin Invitation and remain a base Theater Member.',
    ],
    calendarDisclosure: {
      personalCalendar:
        'Shows only the invited Member’s own commitments; pending Admin authority adds no occupancy.',
      theaterCalendar:
        'Shows Member-level opaque occupancy until Admin authority is accepted.',
    },
    conditions: {
      'personal-commitment': ['admin-invitation-awaits-response'],
      'work-queue': [],
      'operational-exception': [],
      notification: ['admin-invitation-notification'],
      'calendar-occupancy': ['opaque-primary-venue-occupancy'],
      'ordinary-information': [
        'cross-theater-membership-summary',
        'active-member-directory',
      ],
    },
    forbiddenDisclosures: [
      'Admin navigation, Work Queue, and detailed Calendar occupancy before acceptance',
      'Owner-only governance controls after acceptance',
      'Another person’s Admin Invitation or response state',
    ],
    id: 'base-member-admin-invitation',
    navigationPath: ['callsheet'],
    personas: ['theater-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'admin-invitation-awaits-response',
      destination: 'callsheet',
      label: 'Accept or decline Lantern Theater Admin authority',
      relationshipLabel: 'Lantern Theater · invited Admin',
    },
    relationshipLabels: ['Theater Member', 'Invited Admin'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'Lantern Theater Member-visible destinations before acceptance',
    ],
    secondaryActions: [
      {
        conditionId: 'active-member-directory',
        destination: 'people-directory',
        label: 'Identify the current Owner and Admins',
        relationshipLabel: 'Lantern Theater · Theater Member',
      },
    ],
    title: 'Base Member chooses whether to accept Admin authority',
    visibleInformation: [
      'The invited authority and who issued it',
      'The consequences of accepting or declining',
      'No Admin capability until explicit acceptance',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Retains only the former Admin’s personal commitments after authority is removed.',
      theaterCalendar:
        'Immediately returns to Member-level opaque disclosure for unrelated private work.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': ['opaque-primary-venue-occupancy'],
      'ordinary-information': [
        'revoked-admin-remains-member',
        'active-member-directory',
      ],
    },
    forbiddenDisclosures: [
      'Stale Theater Operations, Work Queue, People access, or Settings data',
      'Detailed Calendar occupancy granted only by former Admin authority',
      'An authorization-error dead end from retained Admin navigation',
    ],
    id: 'revoked-admin-member-access',
    navigationPath: ['callsheet', 'people-directory'],
    personas: ['theater-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'revoked-admin-remains-member',
      destination: 'people-directory',
      label: 'Continue in Lantern Theater as a Theater Member',
      relationshipLabel: 'Lantern Theater · Theater Member',
    },
    relationshipLabels: ['Former Admin', 'Theater Member'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'Lantern Theater Member-visible Events, Calendar, and People',
    ],
    secondaryActions: [
      {
        conditionId: 'opaque-primary-venue-occupancy',
        destination: 'theater-calendar',
        label: 'Use the Theater Calendar with Member-level disclosure',
        relationshipLabel: 'Lantern Theater · Theater Member',
      },
    ],
    title: 'Revoked Admin access falls back to Theater membership',
    visibleInformation: [
      'Immediate removal of administrative destinations and shared work',
      'Preserved Theater membership and ordinary Member navigation',
      'A clear explanation instead of a forbidden-route dead end',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Combines this person’s Producer, Director, and Cast commitments without duplicating an Occurrence.',
      theaterCalendar:
        'Shows full detail for related Events and opaque occupancy for unrelated private Events.',
    },
    conditions: {
      'personal-commitment': [
        'counteroffer-awaits-producer',
        'availability-response-required',
        'occurrence-call-needs-review',
        'director-cast-plan-needs-work',
        'producer-public-content-incomplete',
      ],
      'work-queue': [],
      'operational-exception': ['counteroffer-nears-expiry'],
      notification: ['counteroffer-notification'],
      'calendar-occupancy': [
        'personal-event-commitment',
        'personal-occurrence-call',
        'authorized-event-occupancy',
      ],
      'ordinary-information': ['authorized-event-summary'],
    },
    forbiddenDisclosures: [
      'A role switcher or duplicated screen per relationship',
      'Theater Operator Work Queue or administration controls',
      'Other Cast Members’ private Availability Responses',
    ],
    id: 'multi-role-producer-director-cast',
    alternateOutcomes: [
      'Decline the Producer Counteroffer without hiding Cast or Director commitments.',
    ],
    navigationPath: ['callsheet', 'event-overview', 'event-review'],
    personas: ['multi-role-person', 'producer', 'director', 'cast-member'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'counteroffer-awaits-producer',
      destination: 'event-review',
      label: 'Respond to The Tempest Counteroffer before expiry',
      relationshipLabel: 'Lantern Theater · The Tempest · Producer',
    },
    relationshipLabels: ['Producer', 'Director', 'Cast Member'],
    relevantScope: [
      'One cross-Theater Callsheet',
      'One relationship-aware Event workspace',
      'One deduplicated personal Calendar',
    ],
    secondaryActions: [
      {
        conditionId: 'availability-response-required',
        destination: 'event-schedule-and-plan',
        label: 'Submit personal availability',
        relationshipLabel: 'Lantern Theater · The Tempest · Cast Member',
      },
      {
        conditionId: 'director-cast-plan-needs-work',
        destination: 'event-cast-and-team',
        label: 'Invite the remaining Cast',
        relationshipLabel: 'Lantern Theater · The Tempest · Director',
      },
      {
        conditionId: 'producer-public-content-incomplete',
        destination: 'event-public-page',
        label: 'Complete the public presentation',
        relationshipLabel: 'Lantern Theater · The Tempest · Producer',
      },
    ],
    title: 'Producer, Director, and Cast relationships coexist',
    visibleInformation: [
      'Separate actionable records for each relationship',
      'One highest-priority action followed by relationship-labeled secondary actions',
      'No duplicated Event or Calendar occupancy',
      'Stable navigation without choosing a role mode',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows the person’s Producer commitments, not all occupancy from the Theater they administer.',
      theaterCalendar:
        'Shows full detail inside the administered Theater and only authorized detail elsewhere.',
    },
    conditions: {
      'personal-commitment': ['producer-public-content-incomplete'],
      'work-queue': ['proposal-awaits-review', 'required-event-staff-unfilled'],
      'operational-exception': [
        'operator-observes-missing-public-content',
        'temporary-hold-nears-expiry',
      ],
      notification: ['proposal-submitted-notification'],
      'calendar-occupancy': [
        'personal-event-commitment',
        'authorized-event-occupancy',
        'operator-schedule-block',
      ],
      'ordinary-information': [
        'self-authored-proposal-blocked',
        'operator-event-pipeline',
        'authorized-event-summary',
      ],
    },
    forbiddenDisclosures: [
      'Review controls for the person’s own Proposal Revision',
      'Owner-only self-approval override and ownership controls',
      'Private Harbor Players data granted only by Lantern Theater Admin authority',
    ],
    id: 'multi-role-admin-reviewer-producer',
    navigationPath: ['callsheet', 'theater-operations', 'event-review'],
    personas: ['multi-role-person', 'admin', 'reviewer', 'producer'],
    primaryViewport: 'desktop',
    primaryAction: {
      conditionId: 'proposal-awaits-review',
      destination: 'event-review',
      label: 'Review Night Music Proposal Revision 2',
      relationshipLabel: 'Lantern Theater · Night Music · eligible Reviewer',
    },
    relationshipLabels: ['Admin', 'Reviewer', 'Producer'],
    relevantScope: [
      'Cross-Theater Callsheet',
      'Lantern Theater Operations as Admin',
      'Night Music review as Reviewer',
      'The Tempest workspace as Producer',
    ],
    secondaryActions: [
      {
        conditionId: 'producer-public-content-incomplete',
        destination: 'event-public-page',
        label: 'Complete The Tempest public content',
        relationshipLabel: 'Harbor Players · The Tempest · Producer',
      },
      {
        conditionId: 'required-event-staff-unfilled',
        destination: 'event-cast-and-team',
        label: 'Fill Night Music’s stage manager need',
        relationshipLabel: 'Lantern Theater · Admin',
      },
      {
        conditionId: 'self-authored-proposal-blocked',
        destination: 'event-review',
        label: 'See why another Reviewer must decide The Tempest',
        relationshipLabel: 'Harbor Players · The Tempest · Proposal author',
      },
    ],
    title: 'Admin, Reviewer, and Producer authority stays relationship-scoped',
    visibleInformation: [
      'Personal Producer work separated from shared Admin work',
      'Eligible review work for one Event and blocked self-review for another',
      'Theater and Event labels that explain why every action is available',
      'Calendar disclosure evaluated per Theater and Event relationship',
    ],
  },
  {
    allowedStartingSurfaces: ['callsheet'],
    calendarDisclosure: {
      personalCalendar:
        'Shows a clear empty state with no invented commitments.',
      theaterCalendar:
        'No Theater Calendar is available without Theater scope.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': [],
      'ordinary-information': ['no-theater-membership'],
    },
    forbiddenDisclosures: [
      'Any Theater-scoped navigation or data',
      'Private Events, People, Calendars, or operational state',
      'A fabricated default Theater or role choice',
    ],
    id: 'authenticated-without-theater-scope',
    navigationPath: ['callsheet'],
    personas: ['authenticated-without-theater'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'no-theater-membership',
      destination: 'callsheet',
      label: 'Create a Theater',
      relationshipLabel: 'No current Theater relationship',
    },
    relationshipLabels: ['Authenticated person'],
    relevantScope: ['Personal Callsheet', 'Personal Calendar empty state'],
    secondaryActions: [
      {
        conditionId: 'no-theater-membership',
        destination: 'callsheet',
        label: 'Use an invitation or Reusable Join Link',
        relationshipLabel: 'No current Theater relationship',
      },
    ],
    title: 'Authenticated person has no Theater scope',
    visibleInformation: [
      'An honest Callsheet empty state',
      'Ways to create or join a Theater',
      'Personal navigation that does not dead-end in forbidden Theater routes',
    ],
  },
  {
    allowedStartingSurfaces: ['public-theater'],
    calendarDisclosure: {
      personalCalendar: 'Not available to a public visitor.',
      theaterCalendar: 'No private or opaque operational Calendar is public.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': [],
      'ordinary-information': ['published-event-summary'],
    },
    forbiddenDisclosures: [
      'Private, draft, unapproved, or unpublished Events',
      'Candidate Slots, temporary holds, Schedule Blocks, and internal state',
      'Private Cast credits and any Member information not selected for Publication',
    ],
    id: 'public-upcoming-event-discovery',
    navigationPath: ['public-theater', 'public-event'],
    personas: ['public-visitor'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'published-event-summary',
      destination: 'public-event',
      label: 'Open The Winter’s Tale',
      relationshipLabel: 'Public visitor',
    },
    relationshipLabels: ['Public visitor'],
    relevantScope: ['Published Lantern Theater page', 'Published Event page'],
    secondaryActions: [
      {
        destination: 'public-event',
        label: 'Follow the external admission action',
        relationshipLabel: 'Public visitor',
      },
    ],
    title: 'Public visitor discovers trustworthy upcoming programming',
    visibleInformation: [
      'Published Events ordered by next public Performance',
      'Image when available, title, next Performance, location, and admission summary',
      'Only the Public Content Revision selected for Publication',
    ],
  },
  {
    allowedStartingSurfaces: ['public-theater'],
    calendarDisclosure: {
      personalCalendar: 'Not available to a public visitor.',
      theaterCalendar: 'No private or opaque operational Calendar is public.',
    },
    conditions: {
      'personal-commitment': [],
      'work-queue': [],
      'operational-exception': [],
      notification: [],
      'calendar-occupancy': [],
      'ordinary-information': ['published-event-cancelled'],
    },
    forbiddenDisclosures: [
      'Private cancellation rationale and internal decision history',
      'Replacement Candidate Slots, temporary holds, or operational recovery work',
      'The Event after its final scheduled Performance has passed',
    ],
    id: 'public-cancelled-event-discovery',
    navigationPath: ['public-theater', 'public-event'],
    personas: ['public-visitor'],
    primaryViewport: 'phone',
    primaryAction: {
      conditionId: 'published-event-cancelled',
      destination: 'public-event',
      label: 'Open the clearly cancelled Night Music Event',
      relationshipLabel: 'Public visitor',
    },
    relationshipLabels: ['Public visitor'],
    relevantScope: [
      'Published Lantern Theater page',
      'Cancelled published Event',
    ],
    secondaryActions: [
      {
        destination: 'public-theater',
        label: 'Return to other upcoming Events',
        relationshipLabel: 'Public visitor',
      },
    ],
    title: 'Public visitor sees cancellation before travelling',
    visibleInformation: [
      'Cancelled state on both the Theater Event card and canonical Event page',
      'Previously published public details needed to identify the Event',
      'Continued discoverability only until the final scheduled Performance passes',
    ],
  },
])

export type OperationalScenarioId = (typeof operationalScenarios)[number]['id']

/** Selects scenarios without maintaining a second, drift-prone persona index. */
export function getOperationalScenariosForPersona(
  persona: OperationalPersonaId,
) {
  return operationalScenarios.filter((scenario) =>
    scenario.personas.some((scenarioPersona) => scenarioPersona === persona),
  )
}
