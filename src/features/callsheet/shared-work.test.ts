import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getMySharedTheaterWork } from './shared-work'

const getCurrentUserFromRequest = vi.fn()
const getTheaterWorkQueue = vi.fn()
const membershipQuery = {
  select: vi.fn(),
  eq: vi.fn(),
}

vi.mock('@/server/auth/session', () => ({
  getCurrentUserFromRequest: () => getCurrentUserFromRequest(),
  getBearerTokenFromRequest: () => 'actor-token',
}))
vi.mock('@/server/supabase/client', () => ({
  createSupabaseAnonClient: () => ({
    from: () => membershipQuery,
  }),
}))
vi.mock('@/features/work-queue/queries', () => ({
  getTheaterWorkQueue: (input: unknown, options: unknown) =>
    getTheaterWorkQueue(input, options),
}))

beforeEach(() => {
  vi.clearAllMocks()
  getCurrentUserFromRequest.mockResolvedValue({
    ok: true,
    data: { id: 'operator' },
  })
  membershipQuery.select.mockReturnValue(membershipQuery)
  membershipQuery.eq.mockImplementation((column: string) =>
    column === 'status'
      ? Promise.resolve({
          data: [
            {
              is_home: true,
              theater_id: 'theater-a',
              theaters: { name: 'A Theater', slug: 'a', status: 'published' },
            },
            {
              is_home: false,
              theater_id: 'theater-b',
              theaters: { name: 'B Theater', slug: 'b', status: 'published' },
            },
          ],
          error: null,
        })
      : membershipQuery,
  )
  getTheaterWorkQueue.mockImplementation(({ theaterSlug }) =>
    Promise.resolve({
      ok: true,
      data: {
        items: [
          {
            id: `proposal:${theaterSlug}`,
            label: 'Review Proposal Revision 1',
            relationship: 'Reviewer',
            priorityReason: 'Proposal Revision awaits review',
            href: `/app/${theaterSlug}/events/event#review`,
            theaterName: `${theaterSlug.toUpperCase()} Theater`,
            eventTitle: 'Event',
            deadlineAt: null,
            kind: 'proposal',
          },
        ],
      },
    }),
  )
})

describe('cross-Theater shared work', () => {
  it('aggregates the signed-in actor’s active Theater Work Queue items without consulting personal alert state', async () => {
    const result = await getMySharedTheaterWork()

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.sharedWork.map((item) => item.id)).toEqual([
      'proposal:a',
      'proposal:b',
    ])
    expect(result.data.theaters.map((theater) => theater.slug)).toEqual([
      'a',
      'b',
    ])
    expect(membershipQuery.eq).toHaveBeenCalledWith('user_id', 'operator')
    expect(membershipQuery.eq).toHaveBeenCalledWith('status', 'active')
    expect(getTheaterWorkQueue).toHaveBeenCalledTimes(2)
    expect(getTheaterWorkQueue).toHaveBeenCalledWith(
      { theaterSlug: 'a' },
      { includeExceptions: false },
    )
    expect(getTheaterWorkQueue).toHaveBeenCalledWith(
      { theaterSlug: 'b' },
      { includeExceptions: false },
    )
  })

  it('does not return shared work for a person with no active Theater membership', async () => {
    membershipQuery.eq.mockImplementation((column: string) =>
      column === 'status'
        ? Promise.resolve({ data: [], error: null })
        : membershipQuery,
    )

    const result = await getMySharedTheaterWork()

    expect(result).toMatchObject({
      ok: true,
      data: { theaters: [], sharedWork: [] },
    })
    expect(getTheaterWorkQueue).not.toHaveBeenCalled()
  })
})
