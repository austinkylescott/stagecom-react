import { describe, expect, it } from 'vitest'

import { createManagedEvent } from './commands'

import type { EventCommandDependencies } from './commands'

describe('managed Event commands', () => {
  it('does not elevate to service role before app authorization succeeds', async () => {
    let created = false
    const dependencies: EventCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
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
})
