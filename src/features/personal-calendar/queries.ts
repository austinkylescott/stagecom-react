import {
  getBearerTokenFromRequest,
  getCurrentUserFromRequest,
} from '@/server/auth/session'
import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'
import { getMyCallsheet } from '@/features/callsheet/queries'

import { createPersonalCalendarProjection } from './read-model'

export async function getMyPersonalCalendar() {
  const currentUser = await getCurrentUserFromRequest()
  if (!currentUser.ok) return currentUser

  const token = getBearerTokenFromRequest()
  if (!token) return err(appError('unauthenticated', 'Sign in is required.'))

  const userClient = createSupabaseAnonClient(token)
  const { data: memberships, error: membershipError } = await userClient
    .from('theater_memberships')
    .select('theater_id, theaters!inner(name, slug)')
    .eq('user_id', currentUser.data.id)
    .eq('status', 'active')

  if (membershipError) return calendarError()
  if (memberships.length === 0) return ok({ entries: [] })

  const theatersById = new Map(
    memberships.map((membership) => [
      membership.theater_id,
      { slug: membership.theaters.slug, title: membership.theaters.name },
    ]),
  )
  const callsheet = await getMyCallsheet()
  if (!callsheet.ok) return calendarError()
  const commitmentEntries = callsheet.data.commitments
    .filter((commitment) => commitment.kind !== 'occurrence_call')
    .map((commitment) => ({
      action: commitment.action,
      endsAt: null,
      event: commitment.event,
      id: `commitment:${commitment.id}`,
      relationship: commitment.relationship,
      startsAt: commitment.actionableAt,
      targetAnchor: commitment.targetAnchor,
      theater: commitment.theater,
    }))
  const service = createSupabaseServiceRoleClient()
  const { data: events, error: eventError } = await service
    .from('shows')
    .select('id, slug, theater_id, title')
    .in('theater_id', [...theatersById.keys()])
    .eq('event_type', 'show')
    .not('lifecycle_status', 'in', '(cancelled,completed)')

  if (eventError) return calendarError()
  if (events.length === 0) {
    return ok({
      entries: createPersonalCalendarProjection({ entries: commitmentEntries }),
    })
  }

  const eventIds = events.map((event) => event.id)
  const [
    castResult,
    staffResult,
    leadershipResult,
    callsResult,
    occurrencesResult,
  ] = await Promise.all([
    service
      .from('show_cast')
      .select('show_id')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .eq('status', 'accepted'),
    service
      .from('show_staff_assignments')
      .select('show_id')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .eq('status', 'accepted'),
    service
      .from('show_leadership')
      .select('role, show_id')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .in('role', ['producer', 'director']),
    service
      .from('show_occurrence_calls')
      .select('call, occurrence_id, show_id')
      .in('show_id', eventIds)
      .eq('user_id', currentUser.data.id)
      .neq('call', 'not_called'),
    service
      .from('show_occurrences')
      .select('confirmed_candidate_slot_id, id, show_id, status')
      .in('show_id', eventIds)
      .neq('status', 'cancelled'),
  ])

  if (
    [
      castResult,
      staffResult,
      leadershipResult,
      callsResult,
      occurrencesResult,
    ].some((result) => result.error)
  ) {
    return calendarError()
  }

  const rawOccurrences = occurrencesResult.data ?? []
  const confirmedSlotIds = rawOccurrences.flatMap((occurrence) =>
    occurrence.confirmed_candidate_slot_id
      ? [occurrence.confirmed_candidate_slot_id]
      : [],
  )
  const { data: slots, error: slotError } = confirmedSlotIds.length
    ? await service
        .from('show_candidate_slots')
        .select('duration_minutes, id, starts_at')
        .in('id', confirmedSlotIds)
    : { data: [], error: null }
  if (slotError) return calendarError()

  const slotById = new Map((slots ?? []).map((slot) => [slot.id, slot]))
  const occurrences = rawOccurrences.flatMap((occurrence) => {
    const slot = occurrence.confirmed_candidate_slot_id
      ? slotById.get(occurrence.confirmed_candidate_slot_id)
      : undefined
    if (!slot) return []
    return [
      {
        endsAt: new Date(
          Date.parse(slot.starts_at) + slot.duration_minutes * 60_000,
        ).toISOString(),
        id: occurrence.id,
        showId: occurrence.show_id,
        startsAt: slot.starts_at,
      },
    ]
  })
  const cast = castResult.data ?? []
  const staff = staffResult.data ?? []
  const leadership = leadershipResult.data ?? []
  const calls = (callsResult.data ?? []).filter(
    (call) =>
      cast.some((membership) => membership.show_id === call.show_id) ||
      staff.some((assignment) => assignment.show_id === call.show_id),
  )
  const eventById = new Map(events.map((event) => [event.id, event]))
  const occurrenceById = new Map(occurrences.map((entry) => [entry.id, entry]))
  const entries = [...commitmentEntries] as Parameters<
    typeof createPersonalCalendarProjection
  >[0]['entries'][number][]

  const addEventOccurrences = (showId: string, relationship: string) => {
    const event = eventById.get(showId)
    const theater = event ? theatersById.get(event.theater_id) : undefined
    if (!event || !theater) return
    for (const occurrence of occurrences) {
      if (occurrence.showId !== showId) {
        continue
      }
      entries.push({
        action: 'Open Event',
        endsAt: occurrence.endsAt,
        event: { slug: event.slug, title: event.title },
        id: `${relationship}:${occurrence.id}`,
        relationship,
        startsAt: occurrence.startsAt,
        targetAnchor: '',
        theater,
      })
    }
  }
  const addEventCommitment = (showId: string, relationship: string) => {
    const event = eventById.get(showId)
    const theater = event ? theatersById.get(event.theater_id) : undefined
    if (!event || !theater) return
    entries.push({
      action: 'Open Event',
      endsAt: null,
      event: { slug: event.slug, title: event.title },
      id: `${relationship}:${event.id}`,
      relationship,
      startsAt: null,
      targetAnchor: '',
      theater,
    })
  }

  for (const castMember of cast)
    addEventOccurrences(castMember.show_id, 'Cast Member')
  for (const staffAssignment of staff)
    addEventCommitment(staffAssignment.show_id, 'Event staff')
  for (const leadershipRole of leadership) {
    addEventOccurrences(
      leadershipRole.show_id,
      leadershipRole.role === 'producer' ? 'Producer' : 'Director',
    )
  }
  for (const call of calls) {
    const occurrence = occurrenceById.get(call.occurrence_id)
    const event = eventById.get(call.show_id)
    const theater = event ? theatersById.get(event.theater_id) : undefined
    if (!occurrence || !event || !theater) continue
    entries.push({
      action: `Review ${call.call} Call`,
      endsAt: occurrence.endsAt,
      event: { slug: event.slug, title: event.title },
      id: `call:${call.occurrence_id}:${call.call}`,
      relationship: cast.some(
        (membership) => membership.show_id === call.show_id,
      )
        ? `Cast Member · ${call.call === 'required' ? 'Required Call' : 'Optional Call'}`
        : `Event staff · ${call.call === 'required' ? 'Required Call' : 'Optional Call'}`,
      startsAt: occurrence.startsAt,
      targetAnchor: `#occurrence-call-${call.occurrence_id}`,
      theater,
    })
  }

  return ok({ entries: createPersonalCalendarProjection({ entries }) })
}

function calendarError() {
  return err(
    appError('external_service_error', 'Your Calendar could not be loaded.'),
  )
}
