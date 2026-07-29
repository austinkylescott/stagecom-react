import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import { getTheaterAccess } from './queries'

import type { z } from 'zod'
import type { eventWorkspaceInputSchema } from './schemas'

export type PublicReadinessBlocker = {
  code:
    | 'description_missing'
    | 'event_at_risk'
    | 'image_missing'
    | 'operational_approval_missing'
    | 'public_content_missing'
    | 'public_performance_missing'
    | 'theater_unpublished'
  message: string
}

export async function getEventPublicContentReadiness(
  input: z.infer<typeof eventWorkspaceInputSchema>,
) {
  const access = await getTheaterAccess(input.theaterSlug)
  if (!access.ok) return access

  const serviceRole = createSupabaseServiceRoleClient()
  const { data: event, error: eventError } = await serviceRole
    .from('shows')
    .select(
      'id, title, description, lifecycle_status, operational_health, published_public_content_revision_id',
    )
    .eq('theater_id', access.data.theater.id)
    .eq('slug', input.eventSlug)
    .maybeSingle()

  if (eventError) {
    return err(
      appError(
        'external_service_error',
        'Public Event content could not be loaded.',
      ),
    )
  }
  if (!event) return err(appError('not_found', 'Event was not found.'))

  const authenticated = createSupabaseAnonClient(access.data.bearerToken)
  const [producerResult, draftResult, castResult, performanceResult] =
    await Promise.all([
      authenticated.rpc('is_show_producer', { p_show_id: event.id }),
      serviceRole
        .from('show_public_content_revisions')
        .select(
          'id, revision_number, title, description, image_url, admission_price_cents, sales_channel, external_url, version, published_at, cast_credits:show_public_content_credits(user_id, display_name, is_publicly_credited, position)',
        )
        .eq('show_id', event.id)
        .is('published_at', null)
        .maybeSingle(),
      serviceRole
        .from('show_cast')
        .select(
          'user_id, public_credit_enabled, profiles!show_cast_user_id_fkey(display_name)',
        )
        .eq('show_id', event.id)
        .eq('status', 'accepted')
        .order('created_at'),
      serviceRole
        .from('show_occurrences')
        .select('*', { count: 'exact', head: true })
        .eq('show_id', event.id)
        .eq('occurrence_type', 'performance')
        .eq('visibility', 'public')
        .not('confirmed_candidate_slot_id', 'is', null),
    ])

  if (
    producerResult.error ||
    draftResult.error ||
    castResult.error ||
    performanceResult.error
  ) {
    return err(
      appError(
        'external_service_error',
        'Public Event content could not be loaded.',
      ),
    )
  }

  const blockers = evaluatePublicReadiness({
    eventAtRisk: event.operational_health === 'at_risk',
    hasDraft: Boolean(draftResult.data),
    hasDescription: Boolean(draftResult.data?.description.trim()),
    hasImage: Boolean(draftResult.data?.image_url),
    hasOperationalApproval: event.lifecycle_status === 'approved',
    hasPublicPerformance: (performanceResult.count ?? 0) > 0,
    theaterPublished: access.data.theater.status === 'published',
  })
  const isTheaterAdmin = access.data.membership.roles.some(
    (role) => role === 'owner' || role === 'admin',
  )

  return ok({
    allowedActions: {
      editPublicContent: Boolean(producerResult.data),
      publishEvent: isTheaterAdmin && blockers.length === 0,
    },
    blockers,
    draft: draftResult.data
      ? {
          admissionPriceCents: draftResult.data.admission_price_cents,
          castCredits: draftResult.data.cast_credits.map((credit) => ({
            displayName: credit.display_name,
            position: credit.position,
            publiclyCredited: credit.is_publicly_credited,
            userId: credit.user_id,
          })),
          description: draftResult.data.description,
          externalUrl: draftResult.data.external_url,
          id: draftResult.data.id,
          imageUrl: draftResult.data.image_url,
          revisionNumber: draftResult.data.revision_number,
          salesChannel: draftResult.data.sales_channel,
          title: draftResult.data.title,
          version: draftResult.data.version,
        }
      : {
          admissionPriceCents: null,
          castCredits: castResult.data.map((castMember, position) => ({
            displayName: castMember.profiles.display_name,
            position,
            publiclyCredited: castMember.public_credit_enabled,
            userId: castMember.user_id,
          })),
          description: event.description ?? '',
          externalUrl: null,
          id: null,
          imageUrl: null,
          revisionNumber: null,
          salesChannel: null,
          title: event.title,
          version: null,
        },
    publishedRevisionId: event.published_public_content_revision_id,
  })
}

export function evaluatePublicReadiness(input: {
  eventAtRisk: boolean
  hasDraft: boolean
  hasDescription: boolean
  hasImage: boolean
  hasOperationalApproval: boolean
  hasPublicPerformance: boolean
  theaterPublished: boolean
}): PublicReadinessBlocker[] {
  const blockers: PublicReadinessBlocker[] = []
  if (!input.theaterPublished) {
    blockers.push({
      code: 'theater_unpublished',
      message: 'Publish the Theater before publishing this Event.',
    })
  }
  if (!input.hasOperationalApproval) {
    blockers.push({
      code: 'operational_approval_missing',
      message: 'Operational Approval is required.',
    })
  }
  if (!input.hasDraft) {
    blockers.push({
      code: 'public_content_missing',
      message: 'Prepare the Event public-content revision.',
    })
  } else {
    if (!input.hasDescription) {
      blockers.push({
        code: 'description_missing',
        message: 'Add a public Event description.',
      })
    }
    if (!input.hasImage) {
      blockers.push({
        code: 'image_missing',
        message: 'Add a public Event image.',
      })
    }
  }
  if (!input.hasPublicPerformance) {
    blockers.push({
      code: 'public_performance_missing',
      message: 'Confirm at least one public Performance.',
    })
  }
  if (input.eventAtRisk) {
    blockers.push({
      code: 'event_at_risk',
      message: 'Management must explicitly allow this At Risk Event.',
    })
  }
  return blockers
}
