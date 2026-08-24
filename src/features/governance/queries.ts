import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { z } from 'zod'
import type { theaterGovernanceInputSchema } from './schemas'

export async function getTheaterGovernance(
  input: z.infer<typeof theaterGovernanceInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const token = getBearerTokenFromRequest()

  if (!token) {
    return err(appError('unauthenticated', 'Sign in is required.'))
  }

  const userSupabase = createSupabaseAnonClient(token)
  const { data: theater, error: theaterError } = await userSupabase
    .from('theaters')
    .select('id')
    .eq('slug', input.theaterSlug)
    .maybeSingle()

  if (theaterError) {
    return err(
      appError(
        'external_service_error',
        'Theater governance could not be loaded.',
      ),
    )
  }

  if (!theater) {
    return err(appError('not_found', 'Theater was not found.'))
  }

  const { data: actorMembership, error: actorError } = await userSupabase
    .from('theater_memberships')
    .select('roles')
    .eq('theater_id', theater.id)
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .maybeSingle()

  if (actorError) {
    return err(
      appError(
        'external_service_error',
        'Theater governance could not be loaded.',
      ),
    )
  }

  if (
    !actorMembership?.roles.some((role) => role === 'owner' || role === 'admin')
  ) {
    return err(appError('forbidden', 'Owner or Admin access is required.'))
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: operationalTheater, error: operationalTheaterError } =
    await supabase
      .from('theaters')
      .select(
        'id, producer_eligibility, owner_self_approval_enabled, counteroffer_response_hours, primary_venue_id, primary_venue_name, setup_buffer_minutes, turnover_buffer_minutes',
      )
      .eq('id', theater.id)
      .single()

  if (operationalTheaterError) {
    return err(
      appError(
        'external_service_error',
        'Theater governance could not be loaded.',
      ),
    )
  }

  return ok({
    governance: {
      counterofferResponseHours: operationalTheater.counteroffer_response_hours,
      ownerSelfApprovalEnabled: operationalTheater.owner_self_approval_enabled,
      primaryVenueId: operationalTheater.primary_venue_id,
      primaryVenueName: operationalTheater.primary_venue_name ?? '',
      producerEligibility: operationalTheater.producer_eligibility,
      setupBufferMinutes: operationalTheater.setup_buffer_minutes,
      theaterId: operationalTheater.id,
      turnoverBufferMinutes: operationalTheater.turnover_buffer_minutes,
    },
  })
}
