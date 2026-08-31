type ActionCapabilities = {
  manageAtRisk?: boolean
  respondToInvitation?: boolean
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
  }
  event: {
    cast: Array<{ status: string }>
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
    resourceRequests: Array<{ quantity: number; resourceType: string }>
    view: 'operational' | 'accepted_cast' | 'pending_invitee'
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
  const latestRevision = input.event.proposalRevisions[0] ?? null
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

  if (
    input.actions.reviewProposalRevisions &&
    latestRevision?.decisionState === 'pending'
  ) {
    if (
      latestRevision.submittedBy === input.actor.userId ||
      (!input.actor.userId && latestRevision.submittedBy === 'actor')
    ) {
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
    } else {
      actions.push({
        label: 'Review Proposal Revision',
        relationship: 'Reviewer',
        target: '#review',
      })
    }
  }

  const nextOccurrence =
    input.event.occurrences
      .flatMap((occurrence) =>
        occurrence.confirmedSlot ? [occurrence.confirmedSlot] : [],
      )
      .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0] ??
    null
  const acceptedCastCount = input.event.cast.filter(
    ({ status }) => status === 'accepted',
  ).length
  const pendingCastCount = input.event.cast.filter(
    ({ status }) => status === 'pending',
  ).length
  const requiredStaffCount = input.event.resourceRequests
    .filter(({ resourceType }) => resourceType === 'staff')
    .reduce((total, { quantity }) => total + quantity, 0)

  const sections = [
    { label: 'Overview', target: '#overview' },
    ...(input.event.occurrences.length > 0
      ? [{ label: 'Schedule & Plan', target: '#schedule-plan' }]
      : []),
    ...(input.event.cast.length > 0 || input.event.view === 'pending_invitee'
      ? [{ label: 'Cast & Team', target: '#cast-team' }]
      : []),
    ...(latestRevision && (input.actor.isReviewer || isTheaterOperator)
      ? [{ label: 'Review', target: '#review' }]
      : []),
    ...(input.event.publicContentAvailable
      ? [{ label: 'Public Page', target: '#public-page' }]
      : []),
    ...(input.event.view === 'operational' && latestRevision
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
  ]

  return {
    blockedActions,
    primaryAction: actions[0] ?? null,
    relationships,
    secondaryActions: actions.slice(1),
    sections,
    states: [
      { label: 'Lifecycle', value: input.event.lifecycleStatus },
      {
        label: 'Proposal decision',
        value: latestRevision?.decisionState ?? 'not submitted',
      },
      { label: 'Publication', value: input.event.publicationStatus },
      { label: 'Operational health', value: input.event.operationalHealth },
    ],
    summary: {
      leadership: input.event.leadership.map(
        ({ displayName, role }) => `${displayName} · ${role}`,
      ),
      nextOccurrence,
      participation: { accepted: acceptedCastCount, pending: pendingCastCount },
      publicStatus: input.event.publicationStatus,
      staffing: { unfilled: requiredStaffCount },
      viability: input.event.minimumViableCast
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
