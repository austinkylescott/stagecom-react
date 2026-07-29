import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

export type EventPublicContentCredit = {
  displayName: string
  position: number
  publiclyCredited: boolean
  userId: string
}

export type EventPublicContentRevision = {
  admissionPriceCents: number
  castCredits: EventPublicContentCredit[]
  description: string
  externalUrl: string | null
  id: string
  imageUrl: string | null
  publishedAt: string | null
  revisionNumber: number
  salesChannel: 'external' | 'no_advance_ticketing'
  title: string
  version: number
}

export type PublishedEventContent = {
  admissionPriceCents: number
  castCredits: Array<{ displayName: string; position: number }>
  description: string
  externalUrl: string | null
  imageUrl: string | null
  salesChannel: 'external' | 'no_advance_ticketing'
  title: string
}

export type EventPublicContentPersistence = {
  authorizeEdit: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  findPublishedBySlug: (input: {
    eventSlug: string
    theaterSlug: string
  }) => Promise<{
    content: PublishedEventContent
    event: { id: string; lifecycleStatus: string; slug: string }
    theater: { name: string; slug: string }
  } | null>
  saveDraft: (input: {
    actorUserId: string
    admissionPriceCents: number
    castCredits: Array<{
      position: number
      publiclyCredited: boolean
      userId: string
    }>
    commandId: string
    description: string
    eventId: string
    expectedVersion: number | null
    externalUrl: string | null
    imageUrl: string | null
    salesChannel: 'external' | 'no_advance_ticketing'
    title: string
  }) => Promise<EventPublicContentRevision>
}

export function createSupabaseEventPublicContentPersistence(): EventPublicContentPersistence {
  return {
    async authorizeEdit(input) {
      const supabase = createAuthenticatedClient()
      const [{ data: event, error: eventError }, { data: isProducer, error }] =
        await Promise.all([
          supabase
            .from('shows')
            .select('id, lifecycle_status')
            .eq('id', input.eventId)
            .maybeSingle(),
          supabase.rpc('is_show_producer', { p_show_id: input.eventId }),
        ])

      if (eventError || error) {
        throw appError(
          'external_service_error',
          'Public-content authorization could not be checked.',
        )
      }

      if (!event) throw appError('not_found', 'Event was not found.')
      if (!isProducer) {
        throw appError(
          'forbidden',
          'Eligible Event Producer access is required.',
        )
      }
      if (
        event.lifecycle_status === 'cancelled' ||
        event.lifecycle_status === 'completed'
      ) {
        throw appError(
          'conflict',
          'Public content cannot be edited for a completed or cancelled Event.',
        )
      }
    },

    async findPublishedBySlug(input) {
      const supabase = createSupabaseAnonClient()
      const { data, error } = await supabase
        .from('shows')
        .select(
          'id, slug, lifecycle_status, theaters!inner(name, slug), public_content:show_public_content_revisions!shows_published_public_content_revision_id_fkey(title, description, image_url, admission_price_cents, sales_channel, external_url, cast_credits:show_public_content_credits(display_name, position))',
        )
        .eq('slug', input.eventSlug)
        .eq('theaters.slug', input.theaterSlug)
        .maybeSingle()

      if (error) {
        throw appError(
          'external_service_error',
          'Published Event could not be loaded.',
        )
      }

      if (!data || !data.public_content) return null

      return {
        content: {
          admissionPriceCents: data.public_content.admission_price_cents,
          castCredits: data.public_content.cast_credits.map((credit) => ({
            displayName: credit.display_name,
            position: credit.position,
          })),
          description: data.public_content.description,
          externalUrl: data.public_content.external_url,
          imageUrl: data.public_content.image_url,
          salesChannel: data.public_content.sales_channel,
          title: data.public_content.title,
        },
        event: {
          id: data.id,
          lifecycleStatus: data.lifecycle_status,
          slug: data.slug,
        },
        theater: data.theaters,
      }
    },

    async saveDraft(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'save_event_public_content_draft',
        {
          p_actor_user_id: input.actorUserId,
          p_admission_price_cents: input.admissionPriceCents,
          p_command_id: input.commandId,
          p_credits: input.castCredits.map((credit) => ({
            position: credit.position,
            publicly_credited: credit.publiclyCredited,
            user_id: credit.userId,
          })),
          p_description: input.description,
          ...(input.expectedVersion !== null
            ? { p_expected_version: input.expectedVersion }
            : {}),
          ...(input.externalUrl !== null
            ? { p_external_url: input.externalUrl }
            : {}),
          ...(input.imageUrl !== null ? { p_image_url: input.imageUrl } : {}),
          p_sales_channel: input.salesChannel,
          p_show_id: input.eventId,
          p_title: input.title,
        },
      )

      if (error) {
        if (error.code === 'P0002') throw appError('not_found', error.message)
        if (error.code === '42501') throw appError('forbidden', error.message)
        if (error.code === '55000' || error.code === '23505') {
          throw appError('conflict', error.message)
        }
        if (
          error.code === '22023' ||
          error.code === '23502' ||
          error.code === '23514'
        ) {
          throw appError('validation_error', error.message)
        }
        throw appError(
          'external_service_error',
          'Public Event content could not be saved.',
        )
      }

      const { data: credits, error: creditsError } = await supabase
        .from('show_public_content_credits')
        .select('user_id, display_name, is_publicly_credited, position')
        .eq('revision_id', data.id)
        .order('position')

      if (creditsError) {
        throw appError(
          'external_service_error',
          'Public Event content could not be loaded after saving.',
        )
      }

      return mapRevision({ ...data, cast_credits: credits })
    },
  }
}

function mapRevision(revision: {
  admission_price_cents: number
  cast_credits: Array<{
    display_name: string
    is_publicly_credited: boolean
    position: number
    user_id: string
  }>
  description: string
  external_url: string | null
  id: string
  image_url: string | null
  published_at: string | null
  revision_number: number
  sales_channel: 'external' | 'no_advance_ticketing'
  title: string
  version: number
}): EventPublicContentRevision {
  return {
    admissionPriceCents: revision.admission_price_cents,
    castCredits: revision.cast_credits.map((credit) => ({
      displayName: credit.display_name,
      position: credit.position,
      publiclyCredited: credit.is_publicly_credited,
      userId: credit.user_id,
    })),
    description: revision.description,
    externalUrl: revision.external_url,
    id: revision.id,
    imageUrl: revision.image_url,
    publishedAt: revision.published_at,
    revisionNumber: revision.revision_number,
    salesChannel: revision.sales_channel,
    title: revision.title,
    version: revision.version,
  }
}

function createAuthenticatedClient() {
  const token = getBearerTokenFromRequest()
  if (!token) throw appError('unauthenticated', 'Sign in is required.')
  return createSupabaseAnonClient(token)
}
