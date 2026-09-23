import { createOperationalExceptionsReadModel } from '@/features/operational-exceptions/read-model'
import { getTheaterAccess } from '@/features/events/queries'
import { parseReservedRange } from '@/features/theater-calendar/reserved-range'
import { getMissingPublicationFields } from '@/features/theaters/publication-readiness'
import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'
import { createWorkQueueReadModel } from './read-model'
import { z } from 'zod'
import type { theaterSlugInputSchema } from '@/features/theaters/schemas'

export async function getTheaterWorkQueue(
  input: z.infer<typeof theaterSlugInputSchema>,
  { includeExceptions = true }: { includeExceptions?: boolean } = {},
) {
  const access = await getTheaterAccess(input.theaterSlug)
  if (!access.ok) return access
  const { theater, membership, actorUserId } = access.data
  const operator = membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )
  // Active membership authorizes this actor's own Theater capability lookup.
  const supabase = createSupabaseServiceRoleClient()
  const capabilities = await supabase
    .from('theater_member_capabilities')
    .select('capability')
    .eq('theater_id', theater.id)
    .eq('user_id', actorUserId)
  if (capabilities.error)
    return err(
      appError('external_service_error', 'Work Queue could not be loaded.'),
    )
  const isReviewer = capabilities.data.some(
    (row) => row.capability === 'reviewer',
  )
  // Establish leadership before reading private Events for a non-Reviewer Member.
  const leadership = await supabase
    .from('show_leadership')
    .select('show_id')
    .eq('user_id', actorUserId)
  if (leadership.error)
    return err(
      appError(
        'external_service_error',
        'Current Theater work could not be loaded.',
      ),
    )
  const eventIds = leadership.data.map((row) => row.show_id)
  if (!operator && !isReviewer && !eventIds.length)
    return ok({ items: [], exceptions: [], canResolveWork: false })
  const [events, profile, members, reservations, completionFailures] =
    await Promise.all([
      supabase
        .from('shows')
        .select(
          `
      id, slug, title, lifecycle_status, approved_proposal_revision_id, operational_health, at_risk_continuation_allowed,
      show_leadership(user_id, role),
      show_proposal_revisions!show_proposal_revisions_show_id_fkey(id, revision_number, decision_state, submitted_by, snapshot, show_proposal_decisions(id), show_counteroffers!show_counteroffers_proposal_revision_id_fkey(id, state, response_deadline, show_schedule_reservations(id, status))),
      show_occurrences(occurrence_type, visibility, confirmed_slot:show_candidate_slots!show_occurrences_confirmed_candidate_slot_id_fkey(starts_at, duration_minutes)),
      show_cancellation_requests(id, resolved_at),
      show_resource_requests(id, resource_type, label, quantity),
      show_staff_assignments(resource_request_id, user_id, status),
      show_public_content_revisions!show_public_content_revisions_show_id_fkey(id, version, description, image_url, published_at)
    `,
        )
        .eq('theater_id', theater.id)
        .eq('event_type', 'show')
        .not('lifecycle_status', 'in', '(cancelled,completed)')
        .or(
          operator || isReviewer
            ? 'id.not.is.null'
            : `id.in.(${eventIds.join(',')})`,
        ),
      supabase
        .from('theaters')
        .select(
          'name, slug, tagline, street, city, state_region, postal_code, country, timezone',
        )
        .eq('id', theater.id)
        .single(),
      supabase
        .from('theater_memberships')
        .select('user_id')
        .eq('theater_id', theater.id)
        .eq('status', 'active'),
      operator || isReviewer
        ? supabase
            .from('show_schedule_reservations')
            .select('resource_id, reserved_during')
            .eq('theater_id', theater.id)
            .eq('status', 'active')
        : Promise.resolve({ data: [], error: null }),
      operator && includeExceptions
        ? supabase
            .from('activity_events')
            .select('entity_id, payload')
            .eq('theater_id', theater.id)
            .eq('entity_type', 'event')
            .eq('action', 'event.completion.failed')
        : Promise.resolve({ data: [], error: null }),
    ])
  if (
    events.error ||
    profile.error ||
    members.error ||
    reservations.error ||
    completionFailures.error
  )
    return err(
      appError('external_service_error', 'Work Queue could not be loaded.'),
    )
  const fields = profile.data
  const ranges = reservations.data.map((reservation) => ({
    resourceId: reservation.resource_id,
    range: parseReservedRange(reservation.reserved_during),
  }))
  if (ranges.some(({ range }) => !range))
    return err(
      appError(
        'external_service_error',
        'Work Queue schedule eligibility could not be loaded.',
      ),
    )
  const domain = {
    now: new Date().toISOString(),
    viewer: { userId: actorUserId, roles: membership.roles, isReviewer },
    theater: {
      id: theater.id,
      slug: theater.slug,
      name: theater.name,
      status: theater.status,
      ownerSelfApprovalEnabled: theater.owner_self_approval_enabled,
      missingPublicationFields: getMissingPublicationFields({
        ...fields,
        stateRegion: fields.state_region,
        postalCode: fields.postal_code,
      }),
    },
    activeMemberIds: members.data.map((member) => member.user_id),
    setupBufferMinutes: theater.setup_buffer_minutes,
    turnoverBufferMinutes: theater.turnover_buffer_minutes,
    reservations: ranges.flatMap(({ resourceId, range }) =>
      range ? [{ resourceId, ...range }] : [],
    ),
    events: events.data.map((event) => {
      const draft = event.show_public_content_revisions.find(
        (revision) => revision.published_at === null,
      )
      const failure = completionFailureSchema.safeParse(
        completionFailures.data.find((row) => row.entity_id === event.id)
          ?.payload,
      )
      const slotEnds = event.show_occurrences.flatMap((occurrence) =>
        occurrence.confirmed_slot
          ? [
              Date.parse(occurrence.confirmed_slot.starts_at) +
                occurrence.confirmed_slot.duration_minutes * 60_000,
            ]
          : [],
      )
      return {
        completionFailure: failure.success
          ? {
              evaluatedAt: failure.data.evaluatedAt,
              finalSlotEndsAt: failure.data.finalConfirmedSlotEndsAt,
            }
          : null,
        finalConfirmedSlotEndsAt: slotEnds.length
          ? new Date(Math.max(...slotEnds)).toISOString()
          : null,
        leadership: event.show_leadership.map((row) => ({
          userId: row.user_id,
          role: row.role,
        })),
        hasPublishedContent: event.show_public_content_revisions.some(
          (row) => row.published_at !== null,
        ),
        counteroffers: event.show_proposal_revisions.flatMap((revision) =>
          revision.show_counteroffers.map((offer) => ({
            id: offer.id,
            state: offer.state,
            deadlineAt: offer.response_deadline,
            hasActiveHold:
              offer.show_schedule_reservations?.status === 'active',
          })),
        ),
        id: event.id,
        slug: event.slug,
        title: event.title,
        lifecycle: event.lifecycle_status,
        approvedRevisionId: event.approved_proposal_revision_id,
        health: event.operational_health,
        continuationAllowed: event.at_risk_continuation_allowed,
        revisions: event.show_proposal_revisions.map((revision) => ({
          id: revision.id,
          number: revision.revision_number,
          state: revision.decision_state,
          authorId: revision.submitted_by,
          hasDecision: Boolean(revision.show_proposal_decisions),
          snapshot: revision.snapshot,
        })),
        occurrences: event.show_occurrences.flatMap((occurrence) =>
          occurrence.confirmed_slot
            ? [
                {
                  startsAt: occurrence.confirmed_slot.starts_at,
                  publicPerformance:
                    occurrence.occurrence_type === 'performance' &&
                    occurrence.visibility === 'public',
                },
              ]
            : [],
        ),
        cancellationRequests: event.show_cancellation_requests.map(
          (request) => ({ id: request.id, resolvedAt: request.resolved_at }),
        ),
        staffingNeeds: event.show_resource_requests
          .filter((request) => request.resource_type === 'staff')
          .map((request) => ({
            id: request.id,
            label: request.label,
            quantity: request.quantity,
          })),
        assignments: event.show_staff_assignments.map((assignment) => ({
          needId: assignment.resource_request_id,
          userId: assignment.user_id,
          status: assignment.status,
        })),
        publicDraft: draft
          ? {
              id: draft.id,
              version: draft.version,
              description: draft.description,
              imageUrl: draft.image_url,
            }
          : null,
      }
    }),
  }
  return ok({
    items: createWorkQueueReadModel(domain),
    exceptions: includeExceptions
      ? createOperationalExceptionsReadModel(domain)
      : [],
    canResolveWork: operator || isReviewer,
  })
}

const completionFailureSchema = z.object({
  evaluatedAt: z.string().datetime({ offset: true }),
  finalConfirmedSlotEndsAt: z.string().datetime({ offset: true }),
})
