import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import type { z } from 'zod'
import type { theaterGovernanceInputSchema } from './schemas'

export async function getTheaterGovernance(
  input: z.infer<typeof theaterGovernanceInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()

  if (!currentUser.ok) {
    return currentUser
  }

  const supabase = createSupabaseServiceRoleClient()
  const { data: theater, error: theaterError } = await supabase
    .from('theaters')
    .select(
      'id, producer_eligibility, owner_self_approval_enabled, counteroffer_response_hours, primary_venue_name, setup_buffer_minutes, turnover_buffer_minutes',
    )
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

  const { data: actorMembership, error: actorError } = await supabase
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

  const [
    { data: memberships, error: membershipError },
    { data: capabilities, error: capabilityError },
  ] = await Promise.all([
    supabase
      .from('theater_memberships')
      .select('user_id, roles, profiles!inner(display_name)')
      .eq('theater_id', theater.id)
      .eq('status', 'active')
      .order('created_at'),
    supabase
      .from('theater_member_capabilities')
      .select('user_id, capability')
      .eq('theater_id', theater.id),
  ])

  if (membershipError || capabilityError) {
    return err(
      appError(
        'external_service_error',
        'Theater governance could not be loaded.',
      ),
    )
  }

  return ok({
    governance: {
      counterofferResponseHours: theater.counteroffer_response_hours,
      ownerSelfApprovalEnabled: theater.owner_self_approval_enabled,
      primaryVenueName: theater.primary_venue_name ?? '',
      producerEligibility: theater.producer_eligibility,
      setupBufferMinutes: theater.setup_buffer_minutes,
      theaterId: theater.id,
      turnoverBufferMinutes: theater.turnover_buffer_minutes,
    },
    members: memberships.map((membership) => ({
      capabilities: capabilities
        .filter((capability) => capability.user_id === membership.user_id)
        .map((capability) => capability.capability),
      displayName: membership.profiles.display_name,
      roles: membership.roles,
      userId: membership.user_id,
    })),
  })
}
