import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getProposalPreparation } from './query'

const queryDependencies = vi.hoisted(() => ({
  createServiceRoleClient: vi.fn(),
  getTheaterAccess: vi.fn(),
}))

vi.mock('../queries', () => ({
  getTheaterAccess: queryDependencies.getTheaterAccess,
}))
vi.mock('@/server/supabase/client', () => ({
  createSupabaseServiceRoleClient: queryDependencies.createServiceRoleClient,
}))

beforeEach(() => vi.clearAllMocks())

describe('getProposalPreparation', () => {
  it('loads only preparation data and projects server-owned capabilities', async () => {
    queryDependencies.getTheaterAccess.mockResolvedValue({
      data: {
        actorUserId: 'producer-1',
        bearerToken: 'token',
        membership: { roles: ['owner'] },
        theater: {
          id: 'theater-1',
          name: 'Stagecom',
          owner_self_approval_enabled: false,
          primary_venue_id: 'venue-1',
          primary_venue_name: 'Main Stage',
          producer_eligibility: 'all_members',
          setup_buffer_minutes: 30,
          slug: 'stagecom',
          status: 'published',
          timezone: 'America/New_York',
          timezone_source: 'manual',
          turnover_buffer_minutes: 15,
        },
      },
      ok: true,
    })

    let showsRead = 0
    const from = vi.fn((table: string) => {
      if (table === 'shows') {
        showsRead += 1
        return showsRead === 1
          ? eventQuery({
              id: 'event-1',
              lifecycle_status: 'draft',
              minimum_viable_cast: 1,
              show_cast: [],
              show_leadership: [{ role: 'producer', user_id: 'producer-1' }],
              show_occurrences: [],
              show_proposed_cast: [],
              show_resource_requests: [],
              slug: 'summer-show',
              target_cast_size: 3,
            })
          : commitmentsQuery([])
      }
      if (table === 'theater_member_capabilities') {
        return capabilitiesQuery([])
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    queryDependencies.createServiceRoleClient.mockReturnValue({ from })

    const result = await getProposalPreparation({
      eventSlug: 'summer-show',
      theaterSlug: 'stagecom',
    })

    expect(result).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({
          capabilities: {
            editOperationalPlan: true,
            selectProposedCast: true,
            submitProposalRevision: true,
            viewResourceRequests: true,
          },
          eventId: 'event-1',
        }),
        ok: true,
      }),
    )
    expect(from.mock.calls.map(([table]) => table)).toEqual([
      'shows',
      'theater_member_capabilities',
      'shows',
    ])
  })
})

function eventQuery(data: unknown) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data, error: null }),
        }),
      }),
    }),
  }
}

function capabilitiesQuery(data: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        eq: async () => ({ data, error: null }),
      }),
    }),
  }
}

function commitmentsQuery(data: unknown[]) {
  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          neq: async () => ({ data, error: null }),
        }),
      }),
    }),
  }
}
