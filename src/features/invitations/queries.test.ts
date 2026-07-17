import { describe, expect, it } from 'vitest'

import { getTargetedInvitationPreview } from './queries'

describe('Targeted Invitation queries', () => {
  it('shows the intended Theater without exposing the recipient email', async () => {
    const result = await getTargetedInvitationPreview(
      { inviteToken: 'targeted-invitation-token-1234567890' },
      {
        hashToken: async () => 'token-hash',
        persistence: {
          previewTargeted: async () => ({
            result: 'pending',
            theaterName: 'Main Stage',
          }),
        },
      },
    )

    expect(result).toEqual({
      ok: true,
      data: { state: 'pending', theaterName: 'Main Stage' },
    })
    expect(JSON.stringify(result)).not.toContain('@')
  })
})
