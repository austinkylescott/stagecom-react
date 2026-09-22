import { getMyCallsheet } from '@/features/callsheet/queries'
import { getTheaterAccess } from '@/features/events/queries'
import { getTheaterWorkQueue } from '@/features/work-queue/queries'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'
import { createEventPortfolioReadModel } from './read-model'
import type { z } from 'zod'
import type { theaterEventsInputSchema } from '@/features/events/schemas'

export async function getEventPortfolio(
  input: z.infer<typeof theaterEventsInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)
  if (!access.ok) return access
  const { theater, membership, actorUserId } = access.data
  const service = createSupabaseServiceRoleClient()
  const operator = membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  const [leadership, cast, staff, capabilities] = await Promise.all([
    service
      .from('show_leadership')
      .select('show_id')
      .eq('user_id', actorUserId),
    service
      .from('show_cast')
      .select('show_id, status, source')
      .eq('user_id', actorUserId),
    service
      .from('show_staff_assignments')
      .select('show_id, status')
      .eq('user_id', actorUserId),
    service
      .from('theater_member_capabilities')
      .select('capability')
      .eq('theater_id', theater.id)
      .eq('user_id', actorUserId),
  ])
  if (leadership.error || cast.error || staff.error || capabilities.error)
    return err(
      appError(
        'external_service_error',
        'Event portfolio could not be loaded.',
      ),
    )
  const reviewer = capabilities.data.some(
    (row) => row.capability === 'reviewer',
  )
  const leaderIds = leadership.data.map((row) => row.show_id)
  const participantIds = [
    ...cast.data
      .filter(
        (row) =>
          row.status === 'accepted' ||
          (row.status === 'pending' && row.source === 'invited'),
      )
      .map((row) => row.show_id),
    ...staff.data
      .filter((row) => row.status === 'accepted' || row.status === 'pending')
      .map((row) => row.show_id),
  ]
  // Only Operators, Reviewers, and current Event leaders receive operational fields.
  let privateQuery = service
    .from('shows')
    .select(
      `
    id, title, slug, lifecycle_status, publication_status, operational_health,
    show_leadership(user_id, role, profiles!show_leadership_user_id_fkey(display_name)),
    show_proposal_revisions!show_proposal_revisions_show_id_fkey(revision_number, decision_state),
    show_occurrences(status, confirmed_candidate_slot_id, confirmed_slot:show_candidate_slots!show_occurrences_confirmed_candidate_slot_id_fkey(starts_at), candidate_slots:show_candidate_slots!show_candidate_slots_occurrence_id_fkey(id, starts_at))
  `,
    )
    .eq('theater_id', theater.id)
    .eq('event_type', 'show')
  if (!operator && !reviewer) privateQuery = privateQuery.in('id', leaderIds)

  const [privateEvents, publicEvents, work, callsheet] = await Promise.all([
    !operator && !reviewer && !leaderIds.length
      ? Promise.resolve({ data: [], error: null })
      : privateQuery,
    operator || reviewer
      ? Promise.resolve({ data: [], error: null })
      : service
          .from('shows')
          .select('id, title, slug, lifecycle_status, publication_status')
          .eq('theater_id', theater.id)
          .eq('event_type', 'show')
          .eq('publication_status', 'published'),
    getTheaterWorkQueue(input),
    getMyCallsheet(),
  ])
  if (privateEvents.error || publicEvents.error)
    return err(
      appError(
        'external_service_error',
        'Event portfolio could not be loaded.',
      ),
    )
  if (!work.ok) return work
  if (!callsheet.ok) return callsheet

  const privateIds = new Set(privateEvents.data.map((event) => event.id))
  const participantIdSet = new Set(participantIds)
  const limitedIds = [...participantIdSet].filter((id) => !privateIds.has(id))
  // Current invitees and participants need only an Event summary. The query
  // does not read Proposal, health, leadership, or scheduling details for them.
  const limitedPrivate = limitedIds.length
    ? await service
        .from('shows')
        .select('id, title, slug, lifecycle_status, publication_status')
        .eq('theater_id', theater.id)
        .eq('event_type', 'show')
        .in('id', limitedIds)
    : { data: [], error: null }
  if (limitedPrivate.error)
    return err(
      appError(
        'external_service_error',
        'Event portfolio could not be loaded.',
      ),
    )
  const limitedById = new Map(
    [
      ...publicEvents.data.filter((event) => !privateIds.has(event.id)),
      ...limitedPrivate.data,
    ].map((event) => [event.id, event]),
  )

  const actions = [
    ...work.data.items.map((item) => ({
      label: item.label,
      href: item.href,
      kind: item.kind,
      relationship: item.relationship,
    })),
    ...callsheet.data.commitments
      .filter((item) => item.theater.slug === theater.slug && item.event.slug)
      .map((item) => ({
        label: item.action,
        href: `/app/${theater.slug}/events/${item.event.slug}${item.targetAnchor}`,
        kind: item.kind,
        relationship: item.relationship,
        urgent: Boolean(item.urgencyReason),
      })),
  ]
  return ok({
    theater,
    portfolio: createEventPortfolioReadModel({
      now: new Date().toISOString(),
      theaterSlug: theater.slug,
      timezone: theater.timezone ?? 'UTC',
      events: [
        ...privateEvents.data.map((event) => ({
          id: event.id,
          slug: event.slug,
          title: event.title,
          lifecycle: event.lifecycle_status,
          proposal:
            [...event.show_proposal_revisions].sort(
              (a, b) => b.revision_number - a.revision_number,
            )[0]?.decision_state ?? 'not submitted',
          publication: event.publication_status,
          health: event.operational_health,
          dates: event.show_occurrences.flatMap((occurrence) =>
            occurrence.status !== 'cancelled' && occurrence.confirmed_slot
              ? [occurrence.confirmed_slot.starts_at]
              : [],
          ),
          candidateDates: event.show_occurrences.flatMap((occurrence) =>
            occurrence.status !== 'cancelled'
              ? occurrence.candidate_slots
                  .filter(
                    (slot) =>
                      slot.id !== occurrence.confirmed_candidate_slot_id,
                  )
                  .map((slot) => slot.starts_at)
              : [],
          ),
          leadership: event.show_leadership.map((leader) => ({
            userId: leader.user_id,
            displayName: leader.profiles.display_name,
            role: leader.role,
          })),
          limited: false,
        })),
        ...[...limitedById.values()].map((event) => ({
          id: event.id,
          slug: event.slug,
          title: event.title,
          lifecycle: event.lifecycle_status,
          proposal: 'not shared',
          publication: event.publication_status,
          health: 'not shared',
          dates: [],
          candidateDates: [],
          leadership: [],
          limited: true,
          overviewHref: participantIdSet.has(event.id)
            ? `/app/${theater.slug}/events/${event.slug}#overview`
            : `/theater/${theater.slug}/${event.slug}`,
        })),
      ],
      actions,
    }),
    canCreate:
      operator ||
      theater.producer_eligibility === 'all_members' ||
      (theater.producer_eligibility === 'designated_proposers' &&
        capabilities.data.some((row) => row.capability === 'proposer')),
  })
}
