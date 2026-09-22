import { getTheaterAccess } from '@/features/events/queries'
import { createEventHistoryReadModel } from '@/features/events/event-history/read-model'
import { getTheaterCalendar } from '@/features/theater-calendar/queries'
import { canManageTheater } from '@/features/theaters/permissions'
import { getTheaterWorkQueue } from '@/features/work-queue/queries'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'
import { createTheaterOperationsReadModel } from './read-model'
import type { z } from 'zod'
import type { theaterSlugInputSchema } from '@/features/theaters/schemas'

export async function getTheaterOperations(
  input: z.infer<typeof theaterSlugInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)
  if (!access.ok) return access
  const { theater, membership, actorUserId } = access.data
  const work = await getTheaterWorkQueue(input)
  if (!work.ok) return work

  // Preserve the relationship-scoped landing for Members and Reviewers. Never
  // read the Theater-wide portfolio or activity on their behalf.
  if (!canManageTheater(membership.roles))
    return ok({ theater, work: work.data, cockpit: null })

  const service = createSupabaseServiceRoleClient()
  const [calendar, events, activity] = await Promise.all([
    getTheaterCalendar(input, { includeScheduleBlocks: false }),
    service
      .from('shows')
      .select(
        'id, slug, title, lifecycle_status, publication_status, operational_health, show_occurrences(status, confirmed_slot:show_candidate_slots!show_occurrences_confirmed_candidate_slot_id_fkey(starts_at, duration_minutes))',
      )
      .eq('theater_id', theater.id)
      .eq('event_type', 'show'),
    service
      .from('activity_events')
      .select(
        'id, action, actor_user_id, created_at, entity_id, entity_type, visibility, profiles!activity_events_actor_user_id_fkey(display_name)',
      )
      .eq('theater_id', theater.id)
      .in('visibility', ['admin_only', 'member_visible'])
      .order('created_at', { ascending: false })
      .order('id')
      .limit(6),
  ])
  if (!calendar.ok) return calendar
  if (events.error || activity.error)
    return err(
      appError(
        'external_service_error',
        'Theater Operations could not be loaded. Try again.',
      ),
    )

  const history = createEventHistoryReadModel({
    actorUserId,
    canViewAdminActivity: true,
    events: activity.data.map((entry) => ({
      id: entry.id,
      action: entry.action,
      actorUserId: entry.actor_user_id,
      actorDisplayName: entry.profiles?.display_name ?? null,
      createdAt: entry.created_at,
      visibility: entry.visibility,
      payload: null,
    })),
  })
  return ok({
    theater,
    work: work.data,
    cockpit: createTheaterOperationsReadModel({
      now: new Date().toISOString(),
      work: work.data,
      calendar: calendar.data.entries,
      events: events.data.map((event) => ({
        lifecycle: event.lifecycle_status,
        publication: event.publication_status,
        health: event.operational_health,
        confirmedSlots: event.show_occurrences.flatMap((occurrence) =>
          occurrence.confirmed_slot && occurrence.status !== 'cancelled'
            ? [
                {
                  startsAt: occurrence.confirmed_slot.starts_at,
                  endsAt: new Date(
                    Date.parse(occurrence.confirmed_slot.starts_at) +
                      occurrence.confirmed_slot.duration_minutes * 60_000,
                  ).toISOString(),
                },
              ]
            : [],
        ),
      })),
      activity: history.entries.map((entry) => {
        const source = activity.data.find((row) => row.id === entry.id)
        const event =
          source?.entity_type === 'event'
            ? events.data.find((row) => row.id === source.entity_id)
            : null
        return {
          ...entry,
          eventTitle: event?.title ?? null,
          href: event
            ? `/app/${theater.slug}/events/${event.slug}#history`
            : null,
        }
      }),
    }),
  })
}
