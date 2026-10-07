import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getEventPortfolio } from './query'

const fixtures = vi.hoisted(() => {
  const cast: Array<{ show_id: string; status: string; source: string }> = []
  const staff: Array<{ show_id: string; status: string }> = []
  const rosterReads: string[][] = []
  return { cast, staff, rosterReads }
})
vi.mock('@/features/events/queries', () => ({
  getTheaterAccess: async () => ({
    ok: true,
    data: {
      theater: {
        id: 'theater',
        slug: 'stage',
        producer_eligibility: 'all_members',
      },
      membership: { roles: ['member'] },
      actorUserId: 'actor',
      bearerToken: 'token',
    },
  }),
}))
vi.mock('@/features/work-queue/queries', () => ({
  getTheaterWorkQueue: async () => ({ ok: true, data: { items: [] } }),
}))
vi.mock('@/features/callsheet/event-commitments', () => ({
  getEventCommitments: async () => ({ ok: true, data: [] }),
}))
vi.mock('@/server/supabase/client', () => ({
  createSupabaseServiceRoleClient: () => ({
    from(table: string) {
      let columns = ''
      let ids: string[] = []
      const query = {
        select(value: string) {
          columns = value
          return query
        },
        eq() {
          return query
        },
        in(_column: string, value: string[]) {
          ids = value
          return query
        },
        then(resolve: (value: unknown) => unknown) {
          let data: unknown[] = []
          if (table === 'show_cast') data = fixtures.cast
          if (table === 'show_staff_assignments') data = fixtures.staff
          if (table === 'shows' && columns.includes('show_cast')) {
            fixtures.rosterReads.push(ids)
            data = ids.map((id) => ({
              id,
              show_cast: [
                {
                  user_id: 'accepted-member',
                  status: 'accepted',
                  profiles: {
                    display_name: 'Accepted Member',
                    avatar_url: null,
                  },
                },
                {
                  status: 'pending',
                  profiles: { display_name: 'Pending Invitee' },
                },
              ],
              show_occurrences: [
                {
                  status: 'scheduled',
                  confirmed_slot: { starts_at: '2099-10-23T23:00:00Z' },
                },
              ],
            }))
          } else if (table === 'shows' && ids.length) {
            data = ids.map((id) => ({
              id,
              slug: id,
              title: id,
              lifecycle_status: 'draft',
              publication_status: 'private',
            }))
          }
          return Promise.resolve({ data, error: null }).then(resolve)
        },
      }
      return query
    },
  }),
}))

beforeEach(() => {
  fixtures.cast = []
  fixtures.staff = []
  fixtures.rosterReads = []
})
describe('Event workspace summary authorization', () => {
  it('reads a roster and schedule only for accepted Cast, not pending invitees or Staff', async () => {
    fixtures.cast = [
      { show_id: 'accepted', status: 'accepted', source: 'invited' },
      { show_id: 'invited', status: 'pending', source: 'invited' },
      { show_id: 'requested', status: 'pending', source: 'requested' },
    ]
    fixtures.staff = [{ show_id: 'staff', status: 'accepted' }]
    const result = await getEventPortfolio({ theaterSlug: 'stage' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(fixtures.rosterReads).toEqual([['accepted']])
    expect(
      result.data.workspaceDetails.find((event) => event.id === 'accepted'),
    ).toMatchObject({
      relationships: ['Cast Member'],
      castMembers: [
        {
          userId: 'accepted-member',
          displayName: 'Accepted Member',
          avatarUrl: null,
        },
      ],
      nextDate: '2099-10-23T23:00:00Z',
      scheduleVisible: true,
    })
    for (const id of ['invited', 'staff'])
      expect(
        result.data.workspaceDetails.find((event) => event.id === id),
      ).toMatchObject({
        castMembers: null,
        nextDate: null,
        scheduleVisible: false,
      })
    expect(result.data.workspaceEventIds).not.toContain('requested')
  })
})
