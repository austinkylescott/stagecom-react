import { describe, expect, it } from 'vitest'

import { getReusableJoinLinkPreview } from './public-queries'

describe('Reusable Join Link public queries', () => {
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
})
