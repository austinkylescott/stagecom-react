type ActionCapabilities = {
  manageAtRisk?: boolean
  respondToInvitation?: boolean
  respondToStaffInvitation?: boolean
  respondToCounteroffer?: boolean
  reviewProposalRevisions?: boolean
  useOwnerSelfApproval?: boolean
}

type OverviewInput = {
  actions: ActionCapabilities
  actor: {
    castStatus?: string | null
    isReviewer: boolean
    leadershipRoles?: string[]
    roles: string[]
    userId?: string
    inviterName?: string | null
    invitationKind?: 'cast' | 'staff' | null
  }
  event: {
    cast: Array<{ status: string }>
    hasHistory: boolean
    invitationPlan?: {
      performanceCount: number
      rehearsalCount: number
      theaterName: string
    }
    lifecycleStatus: string
    leadership: Array<{ displayName: string; role: string }>
    minimumViableCast: number | null
    occurrences: Array<{
      confirmedSlot: {
        localStartsAt: string
        locationName: string
        startsAt: string
      } | null
    }>
    operationalHealth: string
    proposalRevisions: Array<{ decisionState: string; submittedBy: string }>
    publicationStatus: string
    publicContentAvailable: boolean
    resourceRequests: Array<{
      acceptedStaffCount?: number
      quantity: number
      resourceType: string
    }>
    staffAssignments?: Array<{ status: string }>
    view: 'operational' | 'accepted_cast' | 'accepted_staff' | 'pending_invitee'
  }
}

type OverviewAction = {
  label: string
  relationship: string
  target: string
}

export type EventOverviewReadModel = ReturnType<
  typeof createEventOverviewReadModel
>

export function createEventOverviewReadModel(input: OverviewInput) {
  const invitationOnly = input.event.view === 'pending_invitee'
  const latestRevision = input.event.proposalRevisions.at(0)
  const isTheaterOperator = input.actor.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  const actions: OverviewAction[] = []
  const blockedActions: Array<{
    explanation: string
    label: string
    relationship: string
  }> = []

  if (input.actions.manageAtRisk) {
    actions.push({
      label: 'Manage At Risk Event',
      relationship: 'Theater Operator',
      target: '#operational-health',
    })
  }

  if (input.actions.respondToCounteroffer) {
    actions.push({
      label: 'Respond to Counteroffer',
      relationship: 'Producer',
      target: '#review',
    })
  }

  if (input.actions.respondToInvitation) {
    actions.push({
      label: 'Respond to Cast invitation',
      relationship: 'Cast invitee',
      target: '#cast-team',
    })
  }
  if (input.actions.respondToStaffInvitation) {
    actions.push({
      label: 'Respond to Event staff assignment',
      relationship: 'Event staff invitee',
      target: '#event-staff-assignment',
    })
  }

  const actorAuthoredLatestRevision =
    latestRevision?.submittedBy === input.actor.userId ||
    (!input.actor.userId && latestRevision?.submittedBy === 'actor')

  if (latestRevision?.decisionState === 'pending') {
    if (actorAuthoredLatestRevision) {
      blockedActions.push({
        explanation:
          'Another eligible Reviewer must decide your Proposal Revision.',
        label: 'Your Proposal Revision awaits review',
        relationship: 'Proposal author',
      })
      if (input.actions.useOwnerSelfApproval) {
        actions.push({
          label: 'Use audited self-approval override',
          relationship: 'Owner',
          target: '#review',
        })
      }
    } else if (input.actions.reviewProposalRevisions) {
      actions.push({
        label: 'Review Proposal Revision',
        relationship: 'Reviewer',
        target: '#review',
      })
    }
  }

  const nextOccurrence = invitationOnly
    ? null
    : (input.event.occurrences
        .flatMap((occurrence) =>
          occurrence.confirmedSlot ? [occurrence.confirmedSlot] : [],
        )
        .sort((left, right) =>
          left.startsAt.localeCompare(right.startsAt),
        )[0] ?? null)
  const acceptedCastCount = invitationOnly
    ? 0
    : input.event.cast.filter(({ status }) => status === 'accepted').length
  const pendingCastCount = invitationOnly
    ? 0
    : input.event.cast.filter(({ status }) => status === 'pending').length
  const requiredStaffCount = invitationOnly
    ? 0
    : input.event.resourceRequests
        .filter(({ resourceType }) => resourceType === 'staff')
        .reduce(
          (total, { acceptedStaffCount = 0, quantity }) =>
            total + Math.max(0, quantity - acceptedStaffCount),
          0,
        )

  const sections = invitationOnly
    ? [
        { label: 'Overview', target: '#overview' },
        { label: 'Cast & Team', target: '#cast-team' },
      ]
    : [
        { label: 'Overview', target: '#overview' },
        { label: 'Schedule & Plan', target: '#schedule-plan' },
        ...(input.event.cast.length > 0 ||
        (input.event.staffAssignments?.length ?? 0) > 0 ||
        input.event.view === 'pending_invitee' ||
        isTheaterOperator ||
        (input.actor.leadershipRoles?.length ?? 0) > 0
          ? [{ label: 'Cast & Team', target: '#cast-team' }]
          : []),
        ...((latestRevision !== undefined ||
          input.actor.leadershipRoles?.includes('producer')) &&
        (input.actor.isReviewer ||
          isTheaterOperator ||
          actorAuthoredLatestRevision ||
          (input.actor.leadershipRoles?.length ?? 0) > 0)
          ? [{ label: 'Review', target: '#review' }]
          : []),
        ...(input.event.publicContentAvailable
          ? [{ label: 'Public Page', target: '#public-page' }]
          : []),
        ...(input.event.hasHistory
          ? [{ label: 'History', target: '#history' }]
          : []),
      ]
  const relationships = [
    ...input.actor.roles.flatMap((role) => {
      if (role === 'owner') return ['Theater Operator · Owner']
      if (role === 'admin') return ['Theater Operator · Admin']
      return []
    }),
    ...(input.actor.isReviewer ? ['Reviewer'] : []),
    ...(input.actor.leadershipRoles ?? []).map(
      (role) => role.charAt(0).toUpperCase() + role.slice(1),
    ),
    ...(input.actor.castStatus === 'accepted'
      ? ['Cast Member']
      : input.actor.castStatus === 'pending'
        ? ['Cast invitee']
        : []),
    ...(input.event.view === 'accepted_staff' ? ['Event staff member'] : []),
    ...(invitationOnly && input.actor.invitationKind === 'staff'
      ? ['Event staff invitee']
      : []),
  ]

  return {
    blockedActions,
    invitation: invitationOnly
      ? {
          inviterName: input.actor.inviterName ?? 'A Theater collaborator',
          planSummary: input.event.invitationPlan
            ? summarizeInvitationPlan(input.event.invitationPlan)
            : 'No Occurrences have been planned yet. Ask the inviter about timing before responding.',
          role:
            input.actor.invitationKind === 'staff'
              ? 'Event staff invitee'
              : 'Cast invitee',
          status: 'pending',
          theaterName: input.event.invitationPlan?.theaterName ?? '',
        }
      : null,
    primaryAction: actions.at(0) ?? null,
    relationships,
    secondaryActions: actions.slice(1),
    sections,
    states: invitationOnly
      ? [{ label: 'Invitation', value: 'pending' }]
      : [
          { label: 'Lifecycle', value: input.event.lifecycleStatus },
          {
            label: 'Proposal decision',
            value: latestRevision?.decisionState ?? 'not submitted',
          },
          { label: 'Publication', value: input.event.publicationStatus },
          { label: 'Operational health', value: input.event.operationalHealth },
        ],
    summary: {
      inviter: invitationOnly ? (input.actor.inviterName ?? null) : null,
      leadership: (invitationOnly ? [] : input.event.leadership).map(
        ({ displayName, role }) => `${displayName} · ${role}`,
      ),
      nextOccurrence,
      participation: { accepted: acceptedCastCount, pending: pendingCastCount },
      publicStatus: invitationOnly ? '' : input.event.publicationStatus,
      staffing: { unfilled: requiredStaffCount },
      viability:
        !invitationOnly && input.event.minimumViableCast
          ? {
              minimum: input.event.minimumViableCast,
              shortfall: Math.max(
                0,
                input.event.minimumViableCast - acceptedCastCount,
              ),
            }
          : null,
    },
  }
}

function summarizeInvitationPlan({
  performanceCount,
  rehearsalCount,
}: {
  performanceCount: number
  rehearsalCount: number
}) {
  const total = rehearsalCount + performanceCount
  if (total === 0)
    return 'No Occurrences have been planned yet. Ask the inviter about timing before responding.'
  const parts = [
    rehearsalCount > 0
      ? `${rehearsalCount} planned Rehearsal${rehearsalCount === 1 ? '' : 's'}`
      : null,
    performanceCount > 0
      ? `${performanceCount} planned Performance${performanceCount === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean)
  return `${parts.join(' and ')}. Exact dates and Calls are shared after acceptance.`
}
