import { describe, expect, it } from 'vitest'

import { createEventOverviewReadModel } from './read-model'

describe('Event Overview read model', () => {
  it('limits a pending Cast invitee to invitation information before acceptance', () => {
    const model = createEventOverviewReadModel({
      actions: { respondToInvitation: true },
      actor: {
        castStatus: 'pending',
        isReviewer: false,
        roles: [],
        inviterName: 'Director Person',
      },
      event: { ...event({ castStatus: 'pending' }), view: 'pending_invitee' },
    })

    expect(model.sections.map(({ label }) => label)).toEqual([
      'Overview',
      'Cast & Team',
    ])
    expect(model.states).toEqual([{ label: 'Invitation', value: 'pending' }])
    expect(model.summary.inviter).toBe('Director Person')
    expect(model.summary.nextOccurrence).toBeNull()
    expect(model.summary.participation).toEqual({ accepted: 0, pending: 0 })
  })

  it('labels a pending staff invitation without exposing Cast work', () => {
    const model = createEventOverviewReadModel({
      actions: { respondToStaffInvitation: true },
      actor: {
        invitationKind: 'staff',
        inviterName: 'Theater Admin',
        isReviewer: false,
        roles: [],
      },
      event: { ...event(), view: 'pending_invitee' },
    })

    expect(model.invitation).toEqual({
      inviterName: 'Theater Admin',
      role: 'Event staff invitee',
      status: 'pending',
    })
    expect(model.relationships).toEqual(['Event staff invitee'])
    expect(model.primaryAction?.relationship).toBe('Event staff invitee')
    expect(model.sections.map(({ label }) => label)).toEqual([
      'Overview',
      'Cast & Team',
    ])
  })
  it('prioritizes an actionable At Risk decision ahead of a review and labels every action by relationship', () => {
    const model = createEventOverviewReadModel({
      actions: { manageAtRisk: true, reviewProposalRevisions: true },
      actor: { isReviewer: true, roles: ['admin'] },
      event: event({ operationalHealth: 'at_risk' }),
    })

    expect(model.primaryAction).toMatchObject({
      label: 'Manage At Risk Event',
      relationship: 'Theater Operator',
      target: '#operational-health',
    })
    expect(model.secondaryActions).toMatchObject([
      { label: 'Review Proposal Revision', relationship: 'Reviewer' },
    ])
  })

  it('explains a self-authored pending Proposal Revision instead of hiding it', () => {
    const model = createEventOverviewReadModel({
      actions: { reviewProposalRevisions: true, useOwnerSelfApproval: false },
      actor: { isReviewer: true, roles: [] },
      event: event({ submittedBy: 'actor' }),
    })

    expect(model.blockedActions).toEqual([
      {
        explanation:
          'Another eligible Reviewer must decide your Proposal Revision.',
        label: 'Your Proposal Revision awaits review',
        relationship: 'Proposal author',
      },
    ])
    expect(model.primaryAction).toBeNull()
  })

  it('keeps the author explanation when the author is not a Reviewer', () => {
    const model = createEventOverviewReadModel({
      actions: {},
      actor: { isReviewer: false, roles: [], userId: 'author' },
      event: event({ submittedBy: 'author' }),
    })

    expect(model.blockedActions).toEqual([
      {
        explanation:
          'Another eligible Reviewer must decide your Proposal Revision.',
        label: 'Your Proposal Revision awaits review',
        relationship: 'Proposal author',
      },
    ])
    expect(model.sections).toContainEqual({
      label: 'Review',
      target: '#review',
    })
  })

  it('keeps independent Event state and authorized section navigation in the overview', () => {
    const model = createEventOverviewReadModel({
      actions: { respondToInvitation: true },
      actor: { castStatus: 'pending', isReviewer: false, roles: [] },
      event: event({
        castStatus: 'pending',
        lifecycleStatus: 'draft',
        operationalHealth: 'healthy',
        publicationStatus: 'unpublished',
      }),
    })

    expect(model.states).toEqual([
      { label: 'Lifecycle', value: 'draft' },
      { label: 'Proposal decision', value: 'pending' },
      { label: 'Publication', value: 'unpublished' },
      { label: 'Operational health', value: 'healthy' },
    ])
    expect(model.sections.map(({ label }) => label)).toEqual([
      'Overview',
      'Schedule & Plan',
      'Cast & Team',
      'History',
    ])
    expect(model.primaryAction).toMatchObject({
      label: 'Respond to Cast invitation',
      relationship: 'Cast invitee',
    })
    expect(model.relationships).toEqual(['Cast invitee'])
  })

  it('keeps Cast & Team reachable for an Event staff member without Cast membership', () => {
    const model = createEventOverviewReadModel({
      actions: {},
      actor: { isReviewer: false, roles: [] },
      event: {
        ...event(),
        staffAssignments: [{ status: 'accepted' }],
        view: 'accepted_staff',
      },
    })

    expect(model.sections).toContainEqual({
      label: 'Cast & Team',
      target: '#cast-team',
    })
  })

  it('keeps planning and first participation actions reachable before records exist', () => {
    const model = createEventOverviewReadModel({
      actions: {},
      actor: { isReviewer: false, leadershipRoles: ['producer'], roles: [] },
      event: {
        ...event(),
        cast: [],
        occurrences: [],
        proposalRevisions: [],
        staffAssignments: [],
      },
    })

    expect(model.sections).toContainEqual({
      label: 'Schedule & Plan',
      target: '#schedule-plan',
    })
    expect(model.sections).toContainEqual({
      label: 'Cast & Team',
      target: '#cast-team',
    })
    expect(model.sections).toContainEqual({
      label: 'Review',
      target: '#review',
    })
  })
})

function event(
  overrides: {
    castStatus?: 'accepted' | 'pending' | null
    lifecycleStatus?: string
    operationalHealth?: string
    publicationStatus?: string
    submittedBy?: string
  } = {},
) {
  return {
    cast: overrides.castStatus ? [{ status: overrides.castStatus }] : [],
    hasHistory: true,
    lifecycleStatus: overrides.lifecycleStatus ?? 'approved',
    leadership: [{ displayName: 'Producer Person', role: 'producer' }],
    minimumViableCast: 2,
    occurrences: [
      {
        confirmedSlot: {
          localStartsAt: '2026-09-01T19:00:00',
          locationName: 'Main Stage',
          startsAt: '2026-09-01T23:00:00Z',
        },
      },
    ],
    operationalHealth: overrides.operationalHealth ?? 'healthy',
    publicationStatus: overrides.publicationStatus ?? 'published',
    proposalRevisions: [
      {
        decisionState: 'pending',
        submittedBy: overrides.submittedBy ?? 'other',
      },
    ],
    publicContentAvailable: false,
    resourceRequests: [],
    view: 'operational' as const,
  }
}
