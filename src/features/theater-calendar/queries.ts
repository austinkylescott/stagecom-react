import { parseReservedRange } from './reserved-range'
import { getTheaterAccess } from '@/features/events/queries'
import { canManageTheater } from '@/features/theaters/permissions'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'
import { createSupabaseScheduleBlockPersistence } from '@/features/schedule-blocks/persistence'
import { createTheaterCalendarProjection } from './read-model'

import type { z } from 'zod'
import type { CalendarOccupancyInput } from './read-model'
import type { theaterCalendarInputSchema } from './schemas'

export async function getTheaterCalendar(
  input: z.infer<typeof theaterCalendarInputSchema>,
  { includeScheduleBlocks = true }: { includeScheduleBlocks?: boolean } = {},
) {
  const access = await getTheaterAccess(input.theaterSlug)
  if (!access.ok) return access
  const { theater, membership, actorUserId } = access.data
  // Member access is established before reading private venue configuration.
  const service = createSupabaseServiceRoleClient()
  const { data: reservations, error: reservationError } = await service
    .from('show_schedule_reservations')
    .select(
      'candidate_slot_id, id, kind, occurrence_id, reserved_during, schedule_block_id, show_id, show_counteroffers(state, response_deadline)',
    )
    .eq('theater_id', theater.id)
    .eq('resource_id', theater.primary_venue_id)
    .eq('status', 'active')
    .order('created_at')
  if (reservationError)
    return err(
      appError(
        'external_service_error',
        'Theater Calendar could not be loaded.',
      ),
    )

  // Confirmed offsite Occurrences are programming, never venue occupancy.
  const { data: theaterEvents, error: theaterEventsError } = await service
    .from('shows')
    .select('id, slug, title')
    .eq('theater_id', theater.id)
    .eq('event_type', 'show')
  if (theaterEventsError)
    return err(
      appError(
        'external_service_error',
        'Theater Calendar could not be loaded.',
      ),
    )
  const eventIds = theaterEvents.map((event) => event.id)
  const { data: offsiteOccurrences, error: offsiteError } = eventIds.length
    ? await service
        .from('show_occurrences')
        .select('id, show_id, occurrence_type, confirmed_candidate_slot_id')
        .in('show_id', eventIds)
        .neq('status', 'cancelled')
        .not('confirmed_candidate_slot_id', 'is', null)
    : { data: [], error: null }
  if (offsiteError)
    return err(
      appError(
        'external_service_error',
        'Theater Calendar could not be loaded.',
      ),
    )
  const occurrenceIds = reservations.flatMap((reservation) =>
    reservation.occurrence_id ? [reservation.occurrence_id] : [],
  )
  const slotIds = [
    ...new Set([
      ...reservations.flatMap((reservation) =>
        reservation.candidate_slot_id ? [reservation.candidate_slot_id] : [],
      ),
      ...offsiteOccurrences.flatMap((occurrence) =>
        occurrence.confirmed_candidate_slot_id
          ? [occurrence.confirmed_candidate_slot_id]
          : [],
      ),
    ]),
  ]
  const blockIds = reservations.flatMap((reservation) =>
    reservation.schedule_block_id ? [reservation.schedule_block_id] : [],
  )
  const [
    leadershipResult,
    castResult,
    staffResult,
    staffCallsResult,
    rolesResult,
    occurrencesResult,
    slotsResult,
    blocksResult,
  ] = await Promise.all([
    eventIds.length
      ? service
          .from('show_leadership')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', actorUserId)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_cast')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', actorUserId)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_staff_assignments')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', actorUserId)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_occurrence_calls')
          .select('show_id, occurrence_id')
          .in('show_id', eventIds)
          .eq('user_id', actorUserId)
          .neq('call', 'not_called')
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_roles')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', actorUserId)
      : Promise.resolve({ data: [], error: null }),
    occurrenceIds.length
      ? service
          .from('show_occurrences')
          .select('id, occurrence_type')
          .in('id', occurrenceIds)
      : Promise.resolve({ data: [], error: null }),
    slotIds.length
      ? service
          .from('show_candidate_slots')
          .select(
            'duration_minutes, id, starts_at, location_kind, location_name',
          )
          .in('id', slotIds)
      : Promise.resolve({ data: [], error: null }),
    blockIds.length
      ? service
          .from('schedule_blocks')
          .select('ends_at, id, private_label, starts_at')
          .in('id', blockIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (
    [
      leadershipResult,
      castResult,
      staffResult,
      staffCallsResult,
      rolesResult,
      occurrencesResult,
      slotsResult,
      blocksResult,
    ].some((result) => result.error)
  )
    return err(
      appError(
        'external_service_error',
        'Theater Calendar could not be loaded.',
      ),
    )

  const events = theaterEvents
  const leadership = leadershipResult.data ?? []
  const cast = castResult.data ?? []
  const staff = staffResult.data ?? []
  const roles = rolesResult.data ?? []
  const occurrences = occurrencesResult.data ?? []
  const slots = slotsResult.data ?? []
  const blocks = blocksResult.data ?? []
  const eventById = new Map(events.map((event) => [event.id, event]))
  const occurrenceById = new Map(
    occurrences.map((occurrence) => [occurrence.id, occurrence]),
  )
  const slotById = new Map(slots.map((slot) => [slot.id, slot]))
  const blockById = new Map(blocks.map((block) => [block.id, block]))
  const involvedEventIds = new Set([
    ...leadership.map(({ show_id }) => show_id),
    ...cast.map(({ show_id }) => show_id),
    ...roles.map(({ show_id }) => show_id),
  ])

  const occupancy: CalendarOccupancyInput[] = []
  for (const reservation of reservations) {
    if (
      reservation.kind === 'counteroffer_hold' &&
      (!reservation.show_counteroffers ||
        reservation.show_counteroffers.state !== 'pending' ||
        Date.parse(reservation.show_counteroffers.response_deadline) <=
          Date.now())
    )
      continue
    if (reservation.kind === 'schedule_block') {
      const block = reservation.schedule_block_id
        ? blockById.get(reservation.schedule_block_id)
        : null
      const range = parseReservedRange(reservation.reserved_during)
      if (block)
        occupancy.push({
          endsAt: range?.endsAt ?? block.ends_at,
          id: reservation.id,
          privateLabel: block.private_label,
          scheduleBlockId: block.id,
          source: 'schedule_block',
          startsAt: range?.startsAt ?? block.starts_at,
        })
      continue
    }
    const slot = reservation.candidate_slot_id
      ? slotById.get(reservation.candidate_slot_id)
      : null
    if (!slot) continue
    const event = reservation.show_id
      ? eventById.get(reservation.show_id)
      : null
    const range = parseReservedRange(reservation.reserved_during)
    occupancy.push({
      endsAt:
        range?.endsAt ??
        new Date(
          new Date(slot.starts_at).getTime() + slot.duration_minutes * 60_000,
        ).toISOString(),
      event: event ?? null,
      occurrenceId: reservation.occurrence_id,
      locationName: slot.location_name,
      id: reservation.id,
      occurrenceType: reservation.occurrence_id
        ? (occurrenceById.get(reservation.occurrence_id)?.occurrence_type ??
          null)
        : null,
      source: reservation.kind === 'counteroffer_hold' ? 'hold' : 'commitment',
      startsAt: range?.startsAt ?? slot.starts_at,
    })
  }

  for (const occurrence of offsiteOccurrences) {
    const slot = occurrence.confirmed_candidate_slot_id
      ? slotById.get(occurrence.confirmed_candidate_slot_id)
      : null
    const event = eventById.get(occurrence.show_id)
    if (!slot || slot.location_kind !== 'off_site' || !event) continue
    occupancy.push({
      id: `offsite:${occurrence.id}`,
      source: 'offsite',
      event,
      occurrenceId: occurrence.id,
      occurrenceType: occurrence.occurrence_type,
      locationName: slot.location_name,
      startsAt: slot.starts_at,
      endsAt: new Date(
        Date.parse(slot.starts_at) + slot.duration_minutes * 60_000,
      ).toISOString(),
    })
  }
  const canManage = canManageTheater(membership.roles)
  const scheduleBlocks =
    canManage && includeScheduleBlocks
      ? await createSupabaseScheduleBlockPersistence().list({
          theaterSlug: input.theaterSlug,
        })
      : null
  return ok({
    canManage,
    entries: createTheaterCalendarProjection({
      canManage,
      involvedOccurrenceIds: new Set(
        (staffCallsResult.data ?? [])
          .filter((call) =>
            staff.some((assignment) => assignment.show_id === call.show_id),
          )
          .map((call) => call.occurrence_id),
      ),
      involvedEventSlugs: new Set(
        [...involvedEventIds].flatMap((id) =>
          eventById.get(id)?.slug ? [eventById.get(id)!.slug] : [],
        ),
      ),
      occupancy,
    }),
    scheduleBlocks,
    theater: {
      id: theater.id,
      name: theater.name,
      primaryVenueName: theater.primary_venue_name ?? 'Primary Venue',
      slug: theater.slug,
      timezone: theater.timezone ?? 'UTC',
    },
  })
}
