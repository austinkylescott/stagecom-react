import { getProducerContentCommitment } from '@/features/events/public-content-readiness'
import { describe, expect, it } from 'vitest'
import { createOperationalExceptionsReadModel as classifyOperationalExceptions } from './operational-exceptions'
import type { OperationalExceptionsInput } from './operational-exceptions'
import { createWorkQueueReadModel } from './read-model'

function input(): OperationalExceptionsInput {
  return {
    now: '2026-09-22T12:00:00Z',
    viewer: { userId: 'operator', roles: ['admin'], isReviewer: false },
    theater: {
      id: 'theater',
      slug: 'stage',
      name: 'Stage',
      status: 'published',
      ownerSelfApprovalEnabled: false,
      missingPublicationFields: [],
    },
    setupBufferMinutes: 0,
    turnoverBufferMinutes: 0,
    reservations: [],
    activeMemberIds: ['operator', 'producer'],
    events: [
      {
        id: 'event',
        slug: 'opening',
        title: 'Opening',
        lifecycle: 'in_review',
        approvedRevisionId: null,
        health: 'healthy',
        continuationAllowed: false,
        revisions: [],
        occurrences: [],
        cancellationRequests: [],
        staffingNeeds: [],
        assignments: [],
        publicDraft: null,
        leadership: [{ userId: 'producer', role: 'producer' }],
        hasPublishedContent: false,
        counteroffers: [
          {
            id: 'offer',
            state: 'pending',
            deadlineAt: '2026-09-23T12:00:00Z',
            hasActiveHold: true,
          },
        ],
      },
    ],
  }
}

function createOperationalExceptionsReadModel(
  state: OperationalExceptionsInput,
) {
  const workItems = createWorkQueueReadModel(state)
  return classifyOperationalExceptions(
    state,
    new Set(workItems.map((item) => item.id)),
  )
}

describe('Operational Exceptions', () => {
  it('monitors approaching Counteroffer and hold expiry without inventing an Operator decision', () => {
    const state = input()
    expect(createWorkQueueReadModel(state)).toEqual([])
    expect(createOperationalExceptionsReadModel(state)).toMatchObject([
      {
        id: 'expiry:offer',
        kind: 'expiry',
        eventTitle: 'Opening',
        theaterName: 'Stage',
        urgency: 'urgent',
        deadlineAt: '2026-09-23T12:00:00Z',
        reason:
          'Producer response is pending; the exclusive temporary hold expires with the Counteroffer.',
        href: '/app/stage/events/opening#counteroffer-offer',
      },
    ])
    state.events[0].counteroffers[0].deadlineAt = '2026-09-23T12:00:00.001Z'
    expect(createOperationalExceptionsReadModel(state)).toEqual([])
    state.events[0].counteroffers[0].deadlineAt = state.now
    expect(createOperationalExceptionsReadModel(state)).toEqual([])
  })
})

it('keeps missing public content with the Producer, and exposes an Operator exception until it is ready', () => {
  const state = input()
  const event = state.events[0]
  event.counteroffers = []
  event.lifecycle = 'approved'
  event.approvedRevisionId = 'approved'
  event.occurrences = [{ startsAt: state.now, publicPerformance: true }]
  expect(createOperationalExceptionsReadModel(state)).toMatchObject([
    {
      kind: 'content',
      reason: 'Producer must prepare the public-content revision.',
    },
  ])
  expect(createWorkQueueReadModel(state)).toEqual([])
  expect(getProducerContentCommitment(event)).toBe(
    'Producer must prepare the public-content revision.',
  )
  event.publicDraft = {
    id: 'draft',
    version: 1,
    description: ' ',
    imageUrl: null,
  }
  expect(getProducerContentCommitment(event)).toBe(
    'Producer must add a public description and public image.',
  )
  state.viewer.userId = 'producer'
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
  event.publicDraft.description = 'A performance'
  event.publicDraft.imageUrl = 'https://example.com/poster.png'
  expect(getProducerContentCommitment(event)).toBeNull()
  expect(createWorkQueueReadModel(state)).toMatchObject([
    { kind: 'publication' },
  ])
  event.publicDraft = null
  event.hasPublishedContent = true
  expect(getProducerContentCommitment(event)).toBeNull()
})

it('shows staffing as watch-only only when this viewer cannot invite accepted coverage', () => {
  const state = input()
  const event = state.events[0]
  event.counteroffers = []
  event.staffingNeeds = [{ id: 'crew', label: 'Crew', quantity: 1 }]
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
  expect(createWorkQueueReadModel(state)).toMatchObject([
    { id: 'staffing:crew' },
  ])
  state.viewer.roles = ['member']
  state.viewer.userId = 'producer'
  expect(createOperationalExceptionsReadModel(state)).toMatchObject([
    {
      id: 'staffing:crew',
      reason:
        'Crew needs 1 more accepted assignment. Theater Operators own staffing invitations.',
    },
  ])
  expect(createWorkQueueReadModel(state)).toEqual([])
  state.viewer.roles = ['admin']
  event.assignments = state.activeMemberIds.map((userId) => ({
    userId,
    needId: 'crew',
    status: 'pending',
  }))
  expect(createOperationalExceptionsReadModel(state)).toMatchObject([
    { id: 'staffing:crew' },
  ])
  expect(createWorkQueueReadModel(state)).toEqual([])
  event.assignments[0].status = 'accepted'
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
})

it('keeps self-authored review and requested edits visible without duplicating a real review action', () => {
  const state = input()
  const event = state.events[0]
  event.counteroffers = []
  event.revisions = [
    {
      id: 'revision',
      number: 1,
      state: 'pending',
      authorId: 'operator',
      hasDecision: false,
      snapshot: { occurrences: [] },
    },
  ]
  expect(createOperationalExceptionsReadModel(state)).toMatchObject([
    {
      id: 'progress:revision',
      reason: 'Another eligible Reviewer must decide this Proposal Revision.',
    },
  ])
  expect(createWorkQueueReadModel(state)).toEqual([])
  state.viewer.roles = ['owner']
  state.theater.ownerSelfApprovalEnabled = true
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
  expect(createWorkQueueReadModel(state)).toHaveLength(1)
  event.revisions[0].state = 'changes_requested'
  expect(createOperationalExceptionsReadModel(state)).toMatchObject([
    { reason: 'Producer must submit the requested Proposal edits.' },
  ])
  state.viewer.userId = 'producer'
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
})

it('shows a recorded safe-completion failure only to Operators while the final commitment is still due', () => {
  const state = input()
  const event = state.events[0]
  event.counteroffers = []
  event.lifecycle = 'approved'
  event.hasPublishedContent = true
  event.completionFailure = {
    evaluatedAt: '2026-09-22T11:00:00Z',
    finalSlotEndsAt: '2026-09-22T10:00:00Z',
  }
  event.finalConfirmedSlotEndsAt = '2026-09-22T10:00:00Z'
  expect(createOperationalExceptionsReadModel(state)).toMatchObject([
    {
      kind: 'completion',
      urgency: 'urgent',
      href: '/app/stage/events/opening#history',
    },
  ])
  expect(createWorkQueueReadModel(state)).toEqual([])
  state.viewer.roles = ['member']
  state.viewer.isReviewer = true
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
  state.viewer.roles = ['admin']
  event.finalConfirmedSlotEndsAt = '2026-09-24T10:00:00Z'
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
  event.lifecycle = 'completed'
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
})

it('combines relationships, ignores Notification state, orders stable ties, and redacts unrelated Members', () => {
  const state = input()
  state.events.push({
    ...state.events[0],
    id: 'second',
    slug: 'second',
    counteroffers: [{ ...state.events[0].counteroffers[0], id: 'aaa' }],
  })
  const expected = createOperationalExceptionsReadModel(state)
  expect(expected.map((item) => item.id)).toEqual([
    'expiry:aaa',
    'expiry:offer',
  ])
  expect(
    createOperationalExceptionsReadModel({
      ...state,
      events: [...state.events].reverse(),
    }),
  ).toEqual(expected)
  const dismissed = {
    ...state,
    notifications: [{ read: true, dismissed: true }],
  }
  expect(createOperationalExceptionsReadModel(dismissed)).toEqual(expected)
  state.viewer.roles = ['member']
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
  state.viewer.userId = 'producer'
  expect(createOperationalExceptionsReadModel(state)).toHaveLength(2)
  state.viewer.userId = 'reviewer'
  state.viewer.isReviewer = true
  expect(createOperationalExceptionsReadModel(state)).toHaveLength(2)
  state.events[0].counteroffers[0].state = 'accepted'
  expect(
    createOperationalExceptionsReadModel(state).map((item) => item.id),
  ).toEqual(['expiry:aaa'])
  state.events[1].lifecycle = 'cancelled'
  expect(createOperationalExceptionsReadModel(state)).toEqual([])
})
