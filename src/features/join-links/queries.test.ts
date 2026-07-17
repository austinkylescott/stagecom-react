import { describe, expect, it } from 'vitest'

import { getReusableJoinLinkPreview, listReusableJoinLinks } from './queries'

describe('Reusable Join Link queries', () => {
  it('previews an active link without exposing its limits or history', async () => {
    const result = await getReusableJoinLinkPreview(
      { joinToken: 'reusable-join-link-token-1234567890' },
      {
        hashToken: async () => 'token-hash',
        persistence: {
          preview: async () => ({
            result: 'active',
            theaterName: 'Main Stage',
          }),
        },
      },
    )

    expect(result).toEqual({
      ok: true,
      data: { state: 'active', theaterName: 'Main Stage' },
    })
  })

  it('lists governed links for an Owner or Admin', async () => {
    const links = [
      {
        createdAt: '2026-07-17T18:00:00.000Z',
        expiresAt: null,
        id: 'link-1',
        maxUses: 10,
        revokedAt: null,
        rotatedFromId: null,
        status: 'active' as const,
        useCount: 2,
      },
    ]
    const result = await listReusableJoinLinks(
      { theaterId: 'theater-1' },
      {
        getCurrentUser: async () => ({ ok: true, data: { id: 'owner-1' } }),
        persistence: {
          canManage: async () => true,
          list: async () => links,
        },
      },
    )

    expect(result).toEqual({ ok: true, data: { links } })
  })
})
