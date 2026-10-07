import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { getEventCommitments } from './event-commitments'
import { upcomingCalls } from './upcoming-calls'

export async function getMyUpcomingCalls() {
  const accessToken = getBearerTokenFromRequest()
  if (!accessToken)
    return err(appError('unauthenticated', 'Sign in is required.'))
  const result = await getEventCommitments({
    accessToken,
    scope: { kind: 'all_active_theaters' },
  })
  if (!result.ok) return result
  return ok(upcomingCalls(result.data))
}
