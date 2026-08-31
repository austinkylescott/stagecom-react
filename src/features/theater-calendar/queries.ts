import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { canManageTheater } from '@/features/theaters/permissions'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'
import { createSupabaseScheduleBlockPersistence } from '@/features/schedule-blocks/persistence'
import { createTheaterCalendarProjection } from './read-model'

import type { z } from 'zod'
import type { CalendarOccupancyInput } from './read-model'
import type { theaterCalendarInputSchema } from './schemas'

export async function getTheaterCalendar(
  input: z.infer<typeof theaterCalendarInputSchema>,
) {
  const currentUser = await getCurrentUserFromRequest()
  if (!currentUser.ok) return currentUser
  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))

  const userClient = createSupabaseAnonClient(token)
  const { data: membership, error: membershipError } = await userClient
    .from('theater_memberships')
    .select(
      'roles, theaters!inner(id, name, primary_venue_id, primary_venue_name, slug)',
    )
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')
    .eq('theaters.slug', input.theaterSlug)
    .maybeSingle()
  if (membershipError)
    return err(
      appError(
        'external_service_error',
        'Theater Calendar could not be loaded.',
      ),
    )
  if (!membership) return err(appError('not_found', 'Theater was not found.'))

  const theater = membership.theaters
  const service = createSupabaseServiceRoleClient()
  const { data: reservations, error: reservationError } = await service
    .from('show_schedule_reservations')
    .select(
      'candidate_slot_id, id, kind, occurrence_id, reserved_during, schedule_block_id, show_id',
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

  const eventIds = reservations.flatMap((reservation) =>
    reservation.show_id ? [reservation.show_id] : [],
  )
  const occurrenceIds = reservations.flatMap((reservation) =>
    reservation.occurrence_id ? [reservation.occurrence_id] : [],
  )
  const slotIds = reservations.flatMap((reservation) =>
    reservation.candidate_slot_id ? [reservation.candidate_slot_id] : [],
  )
  const blockIds = reservations.flatMap((reservation) =>
    reservation.schedule_block_id ? [reservation.schedule_block_id] : [],
  )
  const [
    eventsResult,
    leadershipResult,
    castResult,
    staffResult,
    rolesResult,
    occurrencesResult,
    slotsResult,
    blocksResult,
  ] = await Promise.all([
    eventIds.length
      ? service.from('shows').select('id, slug, title').in('id', eventIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_leadership')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', currentUser.data.id)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_cast')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', currentUser.data.id)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_staff_assignments')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', currentUser.data.id)
          .eq('status', 'accepted')
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? service
          .from('show_roles')
          .select('show_id')
          .in('show_id', eventIds)
          .eq('user_id', currentUser.data.id)
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
          .select('duration_minutes, id, starts_at')
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
      eventsResult,
      leadershipResult,
      castResult,
      staffResult,
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

  const events = eventsResult.data ?? []
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
    ...staff.map(({ show_id }) => show_id),
    ...roles.map(({ show_id }) => show_id),
  ])

  const occupancy: CalendarOccupancyInput[] = []
  for (const reservation of reservations) {
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
      id: reservation.id,
      occurrenceType: reservation.occurrence_id
        ? (occurrenceById.get(reservation.occurrence_id)?.occurrence_type ??
          null)
        : null,
      source: reservation.kind === 'counteroffer_hold' ? 'hold' : 'commitment',
      startsAt: range?.startsAt ?? slot.starts_at,
    })
  }

  const canManage = canManageTheater(membership.roles)
  const scheduleBlocks = canManage
    ? await createSupabaseScheduleBlockPersistence().list({
        theaterSlug: input.theaterSlug,
      })
    : null
  return ok({
    canManage,
    entries: createTheaterCalendarProjection({
      canManage,
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
    },
  })
}

function parseReservedRange(value: unknown) {
  if (typeof value !== 'string') return null
  const match = value.match(/^\[["']?([^,"']+)["']?,["']?([^\)"']+)["']?\)$/)
  return match ? { endsAt: match[2], startsAt: match[1] } : null
}
