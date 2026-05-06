import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import type { z } from 'zod'
import type { getTheaterMembershipInputSchema } from './schemas'

export async function getTheaterMembership(
  input: z.infer<typeof getTheaterMembershipInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: theater, error: theaterError } = await supabase
    .from('theaters')
    .select('id, name, slug')
    .eq('slug', input.theaterSlug)
    .maybeSingle()

  if (theaterError) {
    return err(
      appError(
        'external_service_error',
        'Theater access could not be checked.',
      ),
    )
  }

  if (!theater) {
    return err(appError('not_found', 'Theater was not found.'))
  }

  const { data: membership, error: membershipError } = await supabase
    .from('theater_memberships')
    .select('theater_id, user_id, roles, status, is_home, home_rank, created_at')
    .eq('theater_id', theater.id)
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .maybeSingle()

  if (membershipError) {
    return err(
      appError(
        'external_service_error',
        'Theater membership could not be checked.',
      ),
    )
  }

  if (!membership) {
    return err(appError('forbidden', 'You do not have access to this theater.'))
  }

  return ok({
    membership,
    theater,
  })
}
