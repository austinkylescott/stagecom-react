import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type * as Persistence from './persistence'
import type { Database } from '@/server/db/database.types'
import { appError, err, ok } from '@/server/errors'
import { reviewTeamCastInvitations, sendTeamCastInvitations } from './commands'
import { castReviewClient } from './persistence'

vi.mock('./persistence', async (importOriginal) => ({
  ...(await importOriginal<typeof Persistence>()),
  castReviewClient: vi.fn(),
}))
const eventId = '76000000-0000-4000-8000-000000000001'
const reviewId = '76000000-0000-4000-8000-000000000002'
const teamId = '76000000-0000-4000-8000-000000000003'
const userId = '76000000-0000-4000-8000-000000000004'
const client = createClient<Database>('http://127.0.0.1:54321', 'test-anon-key')
const rpc = vi.spyOn(client, 'rpc')
beforeEach(() => {
  vi.clearAllMocks()
  // The Supabase adapter is the external persistence boundary.
  vi.mocked(castReviewClient).mockResolvedValue(ok(client))
})
describe('reviewed Team invitations', () => {
  it('shows a previously removed Cast Member as excluded rather than losing the named review', async () => {
    rpc.mockResolvedValue({
      success: true,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      data: {
        reviewId,
        snapshot: {
          teams: [],
          recipients: [
            { userId, displayName: 'Alex Member', status: 'removed' },
          ],
        },
      },
    })
    const result = await reviewTeamCastInvitations({
      eventId,
      selection: [{ teamId, memberIds: null }],
    })
    expect(result).toEqual(
      ok({
        reviewId,
        snapshot: {
          teams: [],
          recipients: [
            { userId, displayName: 'Alex Member', status: 'removed' },
          ],
        },
      }),
    )
  })
  it('requires a selection before creating a review', async () => {
    expect(await reviewTeamCastInvitations({ eventId, selection: [] })).toEqual(
      err(appError('validation_error', 'Select at least one Team or subset.')),
    )
    expect(castReviewClient).not.toHaveBeenCalled()
  })
  it('returns the refreshed named review without claiming a send succeeded', async () => {
    const data = {
      state: 'refreshed',
      message: 'Membership changed. Review again.',
      review: {
        reviewId,
        snapshot: {
          teams: [],
          recipients: [
            { userId, displayName: 'New Member', status: 'eligible' },
          ],
        },
      },
    }
    rpc.mockResolvedValue({
      success: true,
      error: null,
      count: null,
      status: 200,
      statusText: 'OK',
      data,
    })
    expect(await sendTeamCastInvitations({ reviewId })).toEqual(ok(data))
  })
  it('requires authentication before sending stored recipients', async () => {
    vi.mocked(castReviewClient).mockResolvedValue(
      err(appError('unauthenticated', 'Sign in is required.')),
    )
    expect(await sendTeamCastInvitations({ reviewId })).toEqual(
      err(appError('unauthenticated', 'Sign in is required.')),
    )
    expect(rpc).not.toHaveBeenCalled()
  })
})
