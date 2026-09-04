import { describe, expect, it } from 'vitest'

import { createEventOverviewReadModel } from './read-model'

describe('Event Overview read model', () => {
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
