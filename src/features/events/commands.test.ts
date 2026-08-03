import { describe, expect, it } from 'vitest'

import {
  completeEvent,
  createManagedEvent,
  inviteEventCastMember,
  recordCandidateSlotAvailability,
  respondToEventCastInvitation,
  saveEventOperationalPlan,
  setOccurrenceCall,
} from './commands'

import type {
  EventCommandDependencies,
  EventCompletionCommandDependencies,
} from './commands'

const unusedCastingPersistence = {
  authorizeAvailabilityResponse: async () => undefined,
  authorizeCastInvitation: async () => undefined,
  authorizeCastResponse: async () => undefined,
  authorizeOccurrenceCall: async () => undefined,
  inviteCastMember: async () => {
    throw new Error('must not run')
  },
  recordAvailabilityResponse: async () => {
    throw new Error('must not run')
  },
  respondToCastInvitation: async () => {
    throw new Error('must not run')
  },
  setOccurrenceCall: async () => {
    throw new Error('must not run')
  },
}

describe('managed Event commands', () => {
  it('completes an eligible Event through the authorized boundary using the deterministic clock', async () => {
    const completions: unknown[] = []
    const dependencies: EventCompletionCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'owner-1' } }),
      now: () => new Date('2026-10-11T01:00:00.000Z'),
      persistence: {
        authorizeCompletion: async () => undefined,
        complete: async (input) => {
          completions.push(input)
          return {
            completedAt: input.now,
            eventId: input.eventId,
            lifecycleStatus: 'completed',
          }
        },
      },
    }

    const result = await completeEvent(
      {
        commandId: '10000000-0000-0000-0000-000000000002',
        eventId: '10000000-0000-0000-0000-000000000001',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        completedAt: '2026-10-11T01:00:00.000Z',
        eventId: '10000000-0000-0000-0000-000000000001',
        lifecycleStatus: 'completed',
      },
    })
    expect(completions).toEqual([
      {
        actorUserId: 'owner-1',
        commandId: '10000000-0000-0000-0000-000000000002',
        eventId: '10000000-0000-0000-0000-000000000001',
        now: '2026-10-11T01:00:00.000Z',
      },
    ])
  })

  it('does not elevate to service role before app authorization succeeds', async () => {
    let created = false
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizePlanEdit: async () => undefined,
        authorizeCreation: async () => {
          throw {
            code: 'forbidden',
            message:
              'Every Producer must be eligible under current Theater policy.',
            status: 403,
          }
        },
        create: async () => {
          created = true
          throw new Error('must not run')
        },
        saveOperationalPlan: async () => {
          throw new Error('must not run')
        },
      },
    }

    const result = await createManagedEvent(
      {
        producerUserIds: [],
        slug: 'denied-event',
        theaterId: '10000000-0000-0000-0000-000000000001',
        title: 'Denied Event',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message:
          'Every Producer must be eligible under current Theater policy.',
        status: 403,
      },
    })
    expect(created).toBe(false)
  })

  it('creates one durable performance Event with explicit leadership and no implicit Cast', async () => {
    const creates: unknown[] = []
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'producer-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizePlanEdit: async () => undefined,
        authorizeCreation: async () => undefined,
        create: async (input) => {
          creates.push(input)
          return {
            castMemberCount: 0,
            directorUserId: input.directorUserId ?? null,
            id: 'event-1',
            lifecycleStatus: 'draft',
            operationalHealth: 'on_track',
            producerUserIds: ['producer-1', 'producer-2'],
            publicationStatus: 'unpublished',
            slug: input.slug,
            theaterId: input.theaterId,
            title: input.title,
          }
        },
        saveOperationalPlan: async () => ({
          candidateSlotCount: 0,
          eventId: 'event-1',
          occurrenceCount: 0,
          resourceRequestCount: 0,
        }),
      },
    }

    const result = await createManagedEvent(
      {
        directorUserId: '20000000-0000-0000-0000-000000000003',
        producerUserIds: ['20000000-0000-0000-0000-000000000002'],
        slug: 'summer-hamlet',
        theaterId: '10000000-0000-0000-0000-000000000001',
        title: 'Summer Hamlet',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        castMemberCount: 0,
        directorUserId: '20000000-0000-0000-0000-000000000003',
        id: 'event-1',
        lifecycleStatus: 'draft',
        operationalHealth: 'on_track',
        producerUserIds: ['producer-1', 'producer-2'],
        publicationStatus: 'unpublished',
        slug: 'summer-hamlet',
        theaterId: '10000000-0000-0000-0000-000000000001',
        title: 'Summer Hamlet',
      },
    })
    expect(creates).toEqual([
      {
        actorUserId: 'producer-1',
        directorUserId: '20000000-0000-0000-0000-000000000003',
        producerUserIds: ['20000000-0000-0000-0000-000000000002'],
        slug: 'summer-hamlet',
        theaterId: '10000000-0000-0000-0000-000000000001',
        title: 'Summer Hamlet',
      },
    ])
  })

  it('does not elevate an unauthorized operational-plan edit', async () => {
    let saved = false
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeCreation: async () => undefined,
        authorizePlanEdit: async () => {
          throw {
            code: 'forbidden',
            message: 'Eligible Event Producer access is required.',
            status: 403,
          }
        },
        create: async () => {
          throw new Error('must not run')
        },
        saveOperationalPlan: async () => {
          saved = true
          throw new Error('must not run')
        },
      },
    }

    const result = await saveEventOperationalPlan(
      {
        eventId: '10000000-0000-0000-0000-000000000001',
        minimumViableCast: 3,
        occurrences: [],
        resourceRequests: [],
        targetCastSize: 5,
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Eligible Event Producer access is required.',
        status: 403,
      },
    })
    expect(saved).toBe(false)
  })

  it('resolves exact slot instants before the transactional plan save', async () => {
    const saves: Array<Record<string, unknown>> = []
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'producer-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeCreation: async () => undefined,
        authorizePlanEdit: async () => undefined,
        create: async () => {
          throw new Error('must not run')
        },
        saveOperationalPlan: async (input) => {
          saves.push(input)
          return {
            candidateSlotCount: 1,
            eventId: input.eventId,
            occurrenceCount: 1,
            resourceRequestCount: 1,
          }
        },
      },
    }

    const result = await saveEventOperationalPlan(
      {
        eventId: '10000000-0000-0000-0000-000000000001',
        minimumViableCast: 3,
        occurrences: [
          {
            candidateSlots: [
              {
                durationMinutes: 120,
                id: '30000000-0000-0000-0000-000000000001',
                localStartsAt: '2026-07-15T19:30',
                locationKind: 'primary_venue',
                locationName: 'Main Stage',
                offSiteApproved: false,
                position: 0,
                resourceId: '40000000-0000-0000-0000-000000000001',
                timezoneName: 'America/New_York',
                timezoneSource: 'manual',
              },
            ],
            confirmedCandidateSlotId: '30000000-0000-0000-0000-000000000001',
            id: '20000000-0000-0000-0000-000000000001',
            position: 0,
            type: 'performance',
            visibility: 'public',
          },
        ],
        resourceRequests: [
          {
            id: '50000000-0000-0000-0000-000000000001',
            label: 'Lighting operator',
            position: 0,
            quantity: 1,
            type: 'staff',
          },
        ],
        targetCastSize: 5,
      },
      dependencies,
    )

    expect(result.ok).toBe(true)
    expect(saves[0]).toMatchObject({
      actorUserId: 'producer-1',
      minimumViableCast: 3,
      occurrences: [
        {
          candidateSlots: [
            {
              startsAt: '2026-07-15T23:30:00.000Z',
              utcOffsetMinutes: -240,
            },
          ],
        },
      ],
      targetCastSize: 5,
    })
  })

  it('returns a typed validation error for an ambiguous local slot time', async () => {
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'producer-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeCreation: async () => undefined,
        authorizePlanEdit: async () => undefined,
        create: async () => {
          throw new Error('must not run')
        },
        saveOperationalPlan: async () => {
          throw new Error('must not run')
        },
      },
    }

    const result = await saveEventOperationalPlan(
      {
        eventId: '10000000-0000-0000-0000-000000000001',
        minimumViableCast: 1,
        occurrences: [
          {
            candidateSlots: [
              {
                durationMinutes: 60,
                id: '30000000-0000-0000-0000-000000000001',
                localStartsAt: '2026-11-01T01:30',
                locationKind: 'off_site',
                locationName: 'Community Hall',
                offSiteApproved: true,
                position: 0,
                timezoneName: 'America/New_York',
                timezoneSource: 'manual',
              },
            ],
            confirmedCandidateSlotId: null,
            id: '20000000-0000-0000-0000-000000000001',
            position: 0,
            type: 'rehearsal',
            visibility: 'internal',
          },
        ],
        resourceRequests: [],
        targetCastSize: 1,
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'validation_error',
        message:
          'That local time is ambiguous in the selected timezone. Choose another time.',
        status: 400,
      },
    })
  })

  it('authorizes before creating a pending Cast invitation', async () => {
    const calls: string[] = []
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'director-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeCastInvitation: async () => {
          calls.push('authorize')
        },
        authorizeCreation: async () => undefined,
        authorizePlanEdit: async () => undefined,
        create: async () => {
          throw new Error('must not run')
        },
        inviteCastMember: async (input) => {
          calls.push('invite')
          return {
            eventId: input.eventId,
            memberUserId: input.memberUserId,
            status: 'pending',
          }
        },
        saveOperationalPlan: async () => {
          throw new Error('must not run')
        },
      },
    }

    const result = await inviteEventCastMember(
      {
        eventId: '10000000-0000-0000-0000-000000000001',
        memberUserId: '20000000-0000-0000-0000-000000000001',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        eventId: '10000000-0000-0000-0000-000000000001',
        memberUserId: '20000000-0000-0000-0000-000000000001',
        status: 'pending',
      },
    })
    expect(calls).toEqual(['authorize', 'invite'])
  })

  it('records participation without changing Candidate Slot availability', async () => {
    const responses: unknown[] = []
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'invitee-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeCreation: async () => undefined,
        authorizePlanEdit: async () => undefined,
        create: async () => {
          throw new Error('must not run')
        },
        respondToCastInvitation: async (input) => {
          responses.push(input)
          return {
            eventId: input.eventId,
            memberUserId: input.actorUserId,
            status: input.response,
          }
        },
        saveOperationalPlan: async () => {
          throw new Error('must not run')
        },
      },
    }

    const result = await respondToEventCastInvitation(
      {
        eventId: '10000000-0000-0000-0000-000000000001',
        response: 'accepted',
      },
      dependencies,
    )

    expect(result.ok).toBe(true)
    expect(responses).toEqual([
      {
        actorUserId: 'invitee-1',
        eventId: '10000000-0000-0000-0000-000000000001',
        response: 'accepted',
      },
    ])
  })

  it('authorizes before recording a versioned Availability Response', async () => {
    const calls: string[] = []
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'invitee-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeAvailabilityResponse: async () => {
          calls.push('authorize')
        },
        authorizeCreation: async () => undefined,
        authorizePlanEdit: async () => undefined,
        create: async () => {
          throw new Error('must not run')
        },
        recordAvailabilityResponse: async (input) => {
          calls.push('record')
          return {
            actorUserId: input.actorUserId,
            candidateSlotId: input.candidateSlotId,
            commandId: input.commandId,
            respondedAt: '2026-07-28T20:00:00.000Z',
            response: input.response,
            userId: input.actorUserId,
            version: 1,
          }
        },
        saveOperationalPlan: async () => {
          throw new Error('must not run')
        },
      },
    }

    const result = await recordCandidateSlotAvailability(
      {
        candidateSlotId: '30000000-0000-0000-0000-000000000001',
        commandId: '40000000-0000-0000-0000-000000000001',
        expectedVersion: null,
        response: 'available',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        actorUserId: 'invitee-1',
        candidateSlotId: '30000000-0000-0000-0000-000000000001',
        commandId: '40000000-0000-0000-0000-000000000001',
        respondedAt: '2026-07-28T20:00:00.000Z',
        response: 'available',
        userId: 'invitee-1',
        version: 1,
      },
    })
    expect(calls).toEqual(['authorize', 'record'])
  })

  it('authorizes the Director before assigning a versioned Occurrence Call', async () => {
    const calls: string[] = []
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'director-1' } }),
      persistence: {
        ...unusedCastingPersistence,
        authorizeCreation: async () => undefined,
        authorizeOccurrenceCall: async () => {
          calls.push('authorize')
        },
        authorizePlanEdit: async () => undefined,
        create: async () => {
          throw new Error('must not run')
        },
        saveOperationalPlan: async () => {
          throw new Error('must not run')
        },
        setOccurrenceCall: async (input) => {
          calls.push('set')
          return {
            actorUserId: input.actorUserId,
            assignedAt: '2026-07-28T20:00:00.000Z',
            call: input.call,
            commandId: input.commandId,
            occurrenceId: input.occurrenceId,
            userId: input.castMemberUserId,
            version: 1,
          }
        },
      },
    }

    const result = await setOccurrenceCall(
      {
        call: 'required',
        castMemberUserId: '20000000-0000-0000-0000-000000000001',
        commandId: '40000000-0000-0000-0000-000000000002',
        expectedVersion: null,
        occurrenceId: '30000000-0000-0000-0000-000000000001',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: true,
      data: {
        actorUserId: 'director-1',
        assignedAt: '2026-07-28T20:00:00.000Z',
        call: 'required',
        commandId: '40000000-0000-0000-0000-000000000002',
        occurrenceId: '30000000-0000-0000-0000-000000000001',
        userId: '20000000-0000-0000-0000-000000000001',
        version: 1,
      },
    })
    expect(calls).toEqual(['authorize', 'set'])
  })
})
