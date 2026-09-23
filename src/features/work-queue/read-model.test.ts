import { describe, expect, it } from 'vitest'
import { createWorkQueueReadModel, orderWorkQueueItems } from './read-model'
import type { TheaterWorkSnapshot } from './read-model'

function input(): TheaterWorkSnapshot {
  return {
    now: '2026-09-22T12:00:00Z',
    setupBufferMinutes: 15,
    turnoverBufferMinutes: 15,
    reservations: [],
    viewer: { userId: 'operator', roles: ['admin'], isReviewer: true },
    theater: {
      id: 'theater',
      slug: 'main-stage',
      name: 'Main Stage',
      status: 'published',
      ownerSelfApprovalEnabled: false,
      missingPublicationFields: [],
    },
    activeMemberIds: ['operator', 'member'],
    events: [
      {
        id: 'event',
        slug: 'opening-night',
        title: 'Opening Night',
        lifecycle: 'in_review',
        approvedRevisionId: null,
        health: 'on_track',
        continuationAllowed: false,
        occurrences: [],
        cancellationRequests: [],
        staffingNeeds: [],
        assignments: [],
        publicDraft: null,
        revisions: [
          {
            id: 'revision',
            number: 1,
            state: 'pending',
            authorId: 'producer',
            hasDecision: false,
            snapshot: { occurrences: [] },
          },
        ],
      },
    ],
  }
}

describe('Work Queue', () => {
  it.each([
    'counteroffered',
    'changes_requested',
    'denied',
    'approved',
  ] as const)('excludes %s Proposals and personal alert state', (state) => {
    const domain = input()
    domain.events[0].revisions[0].state = state
    expect(createWorkQueueReadModel(domain)).toEqual([])
    domain.events[0].revisions[0].state = 'pending'
    const before = createWorkQueueReadModel(domain)
    const dismissed = {
      ...domain,
      notifications: [{ read: true, dismissed: true }],
    }
    expect(createWorkQueueReadModel(dismissed)).toEqual(before)
  })

  it.each(['cancelled', 'completed'])(
    'excludes every kind of Event work for %s Events',
    (lifecycle) => {
      const state = input()
      Object.assign(state.events[0], {
        lifecycle,
        health: 'at_risk',
        approvedRevisionId: 'approved',
        cancellationRequests: [{ id: 'request', resolvedAt: null }],
        staffingNeeds: [{ id: 'need', label: 'Crew', quantity: 1 }],
        publicDraft: {
          id: 'content',
          version: 1,
          description: 'Ready',
          imageUrl: 'image',
        },
        occurrences: [{ startsAt: state.now, publicPerformance: true }],
      })
      expect(createWorkQueueReadModel(state)).toEqual([])
    },
  )

  it('requires active accepted staffing coverage and leaves unrelated responsibilities separate', () => {
    const state = input()
    const event = state.events[0]
    event.revisions = []
    event.staffingNeeds = [{ id: 'need', label: 'Crew', quantity: 2 }]
    event.assignments = [
      { needId: 'need', userId: 'former-member', status: 'accepted' },
      { needId: 'other', userId: 'member', status: 'accepted' },
    ]
    expect(createWorkQueueReadModel(state)[0].label).toBe(
      'Fill Crew · 2 awaiting accepted coverage',
    )
    state.viewer.roles = ['member']
    expect(createWorkQueueReadModel(state)).toEqual([])
  })

  it('excludes publication blocked by approval, public schedule, content, or unresolved risk', () => {
    const state = input()
    const event = state.events[0]
    event.revisions = []
    event.lifecycle = 'approved'
    event.approvedRevisionId = 'approved'
    event.publicDraft = {
      id: 'content',
      version: 1,
      description: 'Ready',
      imageUrl: 'image',
    }
    event.occurrences = [
      { startsAt: '2026-10-01T12:00:00Z', publicPerformance: true },
    ]
    const changes: Array<Partial<TheaterWorkSnapshot['events'][number]>> = [
      { approvedRevisionId: null },
      { lifecycle: 'draft' },
      { occurrences: [] },
      { health: 'at_risk' },
      { publicDraft: { ...event.publicDraft, description: ' ' } },
    ]
    for (const change of changes) {
      const blocked = { ...state, events: [{ ...event, ...change }] }
      expect(
        createWorkQueueReadModel(blocked).some((item) =>
          item.id.startsWith('publication:'),
        ),
      ).toBe(false)
    }
    event.health = 'at_risk'
    event.continuationAllowed = true
    expect(createWorkQueueReadModel(state).map((item) => item.id)).toEqual([
      'publication:content:1',
    ])
  })

  it('orders actual deadlines and risk before ordinary work, with stable ties', () => {
    const state = input()
    const ordinary = createWorkQueueReadModel(state)[0]
    const late = { ...ordinary, id: 'late', deadlineAt: '2026-09-21T12:00:00Z' }
    const soon = { ...ordinary, id: 'soon', deadlineAt: '2026-09-23T12:00:00Z' }
    const risk = { ...ordinary, id: 'risk', kind: 'risk' as const }
    const publication = {
      ...ordinary,
      id: 'publication',
      kind: 'publication' as const,
    }
    const items = [publication, ordinary, soon, late, risk]
    const result = orderWorkQueueItems(items, state.now)
    expect(result.map((item) => item.id)).toEqual([
      'late',
      'risk',
      'soon',
      'proposal:revision',
      'publication',
    ])
    expect(result[0].priorityReason).toBe(
      'Overdue · decision deadline has passed',
    )
    expect(result[2].priorityReason).toBe(
      'Decision deadline expires within 24 hours',
    )
    expect(orderWorkQueueItems([...items].reverse(), state.now)).toEqual(result)
    soon.deadlineAt = '2026-09-23T12:00:00.001Z'
    expect(orderWorkQueueItems([soon], state.now)[0].priorityReason).toBe(
      ordinary.priorityReason,
    )
    expect(
      orderWorkQueueItems([soon], '2026-09-23T12:00:00.001Z')[0].priorityReason,
    ).toContain('Overdue')
    expect(
      orderWorkQueueItems(
        [
          { ...ordinary, id: 'zzz' },
          { ...ordinary, id: 'aaa' },
        ],
        state.now,
      ).map((item) => item.id),
    ).toEqual(['aaa', 'zzz'])
  })

  it('does not invent an expiry from a past rehearsal or an upcoming Performance', () => {
    const state = input()
    const event = state.events[0]
    event.occurrences = [
      { startsAt: '2026-09-01T12:00:00Z', publicPerformance: false },
      { startsAt: '2026-09-23T12:00:00Z', publicPerformance: true },
    ]
    event.lifecycle = 'approved'
    event.approvedRevisionId = 'approved'
    event.revisions = []
    event.publicDraft = {
      id: 'content',
      version: 1,
      description: 'Ready',
      imageUrl: 'image',
    }
    expect(createWorkQueueReadModel(state)).toMatchObject([
      {
        deadlineAt: null,
        priorityReason: 'Public-content snapshot is ready for Publication',
      },
    ])
  })

  it('excludes Owner self-approval blocked by current buffered reservations, but preserves other Reviewers’ decisions', () => {
    const state = input()
    state.viewer.roles = ['owner']
    state.viewer.userId = 'producer'
    state.theater.ownerSelfApprovalEnabled = true
    state.events[0].revisions[0].snapshot = {
      occurrences: [
        {
          confirmedSlot: {
            locationKind: 'primary_venue',
            resourceId: 'venue',
            startsAt: '2026-10-01T12:00:00Z',
            durationMinutes: 60,
          },
        },
      ],
    }
    expect(createWorkQueueReadModel(state)).toHaveLength(1)
    state.reservations = [
      {
        resourceId: 'venue',
        startsAt: '2026-10-01T13:00:00Z',
        endsAt: '2026-10-01T14:00:00Z',
      },
    ]
    expect(createWorkQueueReadModel(state)).toEqual([])
    state.viewer.userId = 'another-reviewer'
    expect(createWorkQueueReadModel(state)).toHaveLength(1)
    state.viewer.userId = 'producer'
    state.reservations[0].startsAt = '2026-10-01T13:15:00Z'
    expect(createWorkQueueReadModel(state)).toHaveLength(1)
    state.events[0].revisions[0].hasDecision = true
    expect(createWorkQueueReadModel(state)).toEqual([])
  })

  it('keeps required coverage unresolved until acceptance and excludes needs with nobody left to invite', () => {
    const state = input()
    const event = state.events[0]
    event.revisions = []
    event.staffingNeeds = [{ id: 'need', label: 'Front of house', quantity: 1 }]
    event.assignments = [
      { needId: 'need', userId: 'member', status: 'pending' },
    ]
    expect(createWorkQueueReadModel(state)).toMatchObject([
      {
        id: 'staffing:need',
        label: 'Fill Front of house · 1 awaiting accepted coverage',
      },
    ])
    event.assignments[0].status = 'accepted'
    expect(createWorkQueueReadModel(state)).toEqual([])
    event.assignments[0].status = 'revoked'
    expect(createWorkQueueReadModel(state)).toHaveLength(1)
    state.activeMemberIds = ['member']
    expect(createWorkQueueReadModel(state)).toEqual([])
    state.activeMemberIds = ['operator', 'member']
    event.assignments.push({
      needId: 'need',
      userId: 'operator',
      status: 'pending',
    })
    expect(createWorkQueueReadModel(state)).toEqual([])
  })
  it('offers only exact publishable snapshots, including a new draft after prior Publication', () => {
    const state = input()
    const event = state.events[0]
    event.revisions = []
    event.lifecycle = 'approved'
    event.approvedRevisionId = 'approved'
    event.publicDraft = {
      id: 'content',
      version: 2,
      description: 'A performance',
      imageUrl: 'https://example.com/image.png',
    }
    event.occurrences = [
      { startsAt: '2026-10-01T12:00:00Z', publicPerformance: true },
    ]
    expect(createWorkQueueReadModel(state)).toMatchObject([
      {
        id: 'publication:content:2',
        href: '/app/main-stage/events/opening-night#public-page',
      },
    ])
    event.publicDraft.imageUrl = ' '
    expect(createWorkQueueReadModel(state)).toEqual([])
    event.publicDraft.imageUrl = 'https://example.com/image.png'
    state.theater.status = 'draft'
    expect(createWorkQueueReadModel(state)).toMatchObject([
      { id: 'publication:theater', href: '/app/main-stage/preview' },
    ])
    state.theater.missingPublicationFields = ['tagline']
    expect(createWorkQueueReadModel(state)).toEqual([])
    state.theater.status = 'published'
    event.publicDraft = null
    expect(createWorkQueueReadModel(state)).toEqual([])
  })
  it('projects unresolved Operator decisions and removes resolved, terminal, or unauthorized work', () => {
    const state = input()
    const event = state.events[0]
    event.revisions = []
    event.lifecycle = 'approved'
    event.approvedRevisionId = 'approved'
    event.health = 'at_risk'
    event.cancellationRequests = [{ id: 'request', resolvedAt: null }]
    expect(createWorkQueueReadModel(state).map((item) => item.id)).toEqual([
      'risk:event',
      'cancellation:request',
    ])
    event.continuationAllowed = true
    event.cancellationRequests[0].resolvedAt = state.now
    expect(createWorkQueueReadModel(state)).toEqual([])
    event.continuationAllowed = false
    state.viewer.roles = ['member']
    expect(createWorkQueueReadModel(state)).toEqual([])
    state.viewer.roles = ['owner']
    event.lifecycle = 'completed'
    expect(createWorkQueueReadModel(state)).toEqual([])
  })
  it('combines relationships without granting self-review or Operator work to a narrow Reviewer', () => {
    const state = input()
    state.viewer.roles = ['member', 'producer', 'cast']
    expect(createWorkQueueReadModel(state)).toHaveLength(1)
    state.viewer.userId = 'producer'
    expect(createWorkQueueReadModel(state)).toEqual([])
    state.viewer.roles = ['owner']
    state.theater.ownerSelfApprovalEnabled = true
    expect(createWorkQueueReadModel(state)).toMatchObject([
      { label: 'Use audited self-approval override', relationship: 'Owner' },
    ])
    state.theater.ownerSelfApprovalEnabled = false
    expect(createWorkQueueReadModel(state)).toEqual([])
    state.viewer.roles = ['admin']
    state.theater.ownerSelfApprovalEnabled = true
    expect(createWorkQueueReadModel(state)).toEqual([])
  })
  it('links eligible review to the exact unresolved Proposal Revision and removes it when decided', () => {
    const state = input()
    expect(createWorkQueueReadModel(state)).toMatchObject([
      {
        id: 'proposal:revision',
        label: 'Review Proposal Revision 1',
        relationship: 'Reviewer',
        priorityReason: 'Proposal Revision awaits review',
        href: '/app/main-stage/events/opening-night#proposal-revision-revision',
      },
    ])
    state.events[0].revisions[0].state = 'approved'
    expect(createWorkQueueReadModel(state)).toEqual([])
  })
})
