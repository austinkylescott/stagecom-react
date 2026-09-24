import { getTheaterWorkQueue } from '@/features/work-queue/queries'
import { orderWorkQueueItems } from '@/features/work-queue/read-model'
import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseAnonClient } from '@/server/supabase/client'

/** Active membership establishes scope; each Work Queue read rechecks action eligibility. */
export async function getMySharedTheaterWork() {
  const currentUser = await getCurrentUserFromRequest()
  if (!currentUser.ok) return currentUser

  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))

  const userSupabase = createSupabaseAnonClient(token)
  const { data: memberships, error } = await userSupabase
    .from('theater_memberships')
    .select('is_home, theater_id, theaters!inner(name, slug, status)')
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')

  if (error) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const theaters = memberships.map((membership) => ({
    id: membership.theater_id,
    isDefault: membership.is_home,
    name: membership.theaters.name,
    slug: membership.theaters.slug,
    status: membership.theaters.status,
  }))

  if (theaters.length === 0) {
    return ok({ actorUserId: currentUser.data.id, sharedWork: [], theaters })
  }

  const sharedResults = await Promise.all(
    theaters.map((theater) =>
      getTheaterWorkQueue(
        { theaterSlug: theater.slug },
        { accessToken: token, mode: 'decisions' },
      ),
    ),
  )
  const failedRead = sharedResults.find((result) => !result.ok)
  if (failedRead) return failedRead

  return ok({
    actorUserId: currentUser.data.id,
    sharedWork: orderWorkQueueItems(
      sharedResults.flatMap((result) => (result.ok ? result.data.items : [])),
      new Date().toISOString(),
    ),
    theaters,
  })
}
