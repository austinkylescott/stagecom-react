import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import { getTheaterAccess } from '../queries'
import {
  createProposalPreparationRecommendations,
  createProposalPreparationReadModel,
} from './read-model'

import type { z } from 'zod'
import type { eventWorkspaceInputSchema } from '../schemas'

export async function getProposalPreparation(
  input: z.infer<typeof eventWorkspaceInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)
  if (!access.ok) return access

  const supabase = createSupabaseServiceRoleClient()
  const [eventResult, capabilityResult] = await Promise.all([
    supabase
      .from('shows')
      .select(
        'id, slug, lifecycle_status, target_cast_size, minimum_viable_cast, show_leadership(user_id, role), show_cast(user_id, status, profiles!show_cast_user_id_fkey(display_name)), show_proposed_cast(user_id), show_occurrences(id, occurrence_type, visibility, position, confirmed_candidate_slot_id, candidate_slots:show_candidate_slots!show_candidate_slots_occurrence_id_fkey(id, starts_at, duration_minutes, local_starts_at, timezone_name, timezone_source, location_kind, resource_id, location_name, off_site_approved, position)), show_resource_requests(id, resource_type, label, quantity, position)',
      )
      .eq('theater_id', access.data.theater.id)
      .eq('slug', input.eventSlug)
      .maybeSingle(),
    supabase
      .from('theater_member_capabilities')
      .select('capability')
      .eq('theater_id', access.data.theater.id)
      .eq('user_id', access.data.actorUserId),
  ])

  if (eventResult.error || capabilityResult.error) {
    return err(
      appError(
        'external_service_error',
        'Proposal preparation could not be loaded.',
      ),
    )
  }
  if (!eventResult.data) {
    return err(appError('not_found', 'Event was not found.'))
  }

  const event = eventResult.data
  const actorLeadership = event.show_leadership.filter(
    ({ user_id }) => user_id === access.data.actorUserId,
  )
  const isTheaterAdmin = access.data.membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  const isReviewer =
    isTheaterAdmin ||
    capabilityResult.data.some(({ capability }) => capability === 'reviewer')
  if (!isReviewer && actorLeadership.length === 0) {
    return err(
      appError('forbidden', 'Event proposal preparation access is required.'),
    )
  }

  const candidateSlotIds = event.show_occurrences.flatMap((occurrence) =>
    occurrence.candidate_slots.map(({ id }) => id),
  )
  const occurrenceIds = event.show_occurrences.map(({ id }) => id)
  const [availabilityResult, callsResult, commitmentsResult] =
    await Promise.all([
      candidateSlotIds.length > 0
        ? supabase
            .from('show_availability_responses')
            .select('candidate_slot_id, user_id, response')
            .in('candidate_slot_id', candidateSlotIds)
        : Promise.resolve({ data: [], error: null }),
      occurrenceIds.length > 0
        ? supabase
            .from('show_occurrence_calls')
            .select('occurrence_id, user_id, call')
            .in('occurrence_id', occurrenceIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('shows')
        .select(
          'show_occurrences(confirmed_slot:show_candidate_slots!show_occurrences_confirmed_candidate_slot_id_fkey(starts_at, duration_minutes, location_kind))',
        )
        .eq('theater_id', access.data.theater.id)
        .eq('lifecycle_status', 'approved')
        .neq('id', event.id),
    ])

  if (
    availabilityResult.error ||
    callsResult.error ||
    commitmentsResult.error
  ) {
    return err(
      appError(
        'external_service_error',
        'Proposal preparation could not be loaded.',
      ),
    )
  }

  const primaryVenueCommitments = commitmentsResult.data.flatMap((item) =>
    item.show_occurrences.flatMap((occurrence) =>
      occurrence.confirmed_slot?.location_kind === 'primary_venue'
        ? [
            {
              durationMinutes: occurrence.confirmed_slot.duration_minutes,
              startsAt: occurrence.confirmed_slot.starts_at,
            },
          ]
        : [],
    ),
  )
  const isProducer = actorLeadership.some(({ role }) => role === 'producer')
  const canEditOperationalPlan =
    isProducer &&
    (event.lifecycle_status === 'draft' ||
      event.lifecycle_status === 'approved')
  const canEditDraftProposal = isProducer && event.lifecycle_status === 'draft'
  const proposedCastUserIds = event.show_proposed_cast.map(
    ({ user_id }) => user_id,
  )
  const recommendations = createProposalPreparationRecommendations({
    availability: availabilityResult.data,
    calls: callsResult.data,
    commitments: primaryVenueCommitments,
    event,
    proposedCastUserIds,
    setupBufferMinutes: access.data.theater.setup_buffer_minutes,
    turnoverBufferMinutes: access.data.theater.turnover_buffer_minutes,
  })

  return ok(
    createProposalPreparationReadModel({
      acceptedCastMembers: event.show_cast
        .filter(({ status }) => status === 'accepted')
        .map((castMember) => ({
          displayName: castMember.profiles.display_name,
          userId: castMember.user_id,
        })),
      capabilities: {
        editOperationalPlan: canEditOperationalPlan,
        selectProposedCast: canEditDraftProposal,
        submitProposalRevision: canEditDraftProposal,
        viewResourceRequests: true,
      },
      event,
      includeResourceRequests: true,
      proposedCastUserIds,
      recommendations,
      theater: {
        primaryVenueId: access.data.theater.primary_venue_id,
        primaryVenueName:
          access.data.theater.primary_venue_name ?? 'Primary Venue',
        slug: access.data.theater.slug,
        timezoneName: access.data.theater.timezone ?? 'UTC',
        timezoneSource: access.data.theater.timezone_source,
      },
    }),
  )
}
