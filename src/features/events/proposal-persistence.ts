import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'

import type { Json } from '@/server/db/database.types'

export type ProposalRevision = {
  commandId: string
  decisionState:
    'pending' | 'changes_requested' | 'counteroffered' | 'approved' | 'denied'
  eventId: string
  id: string
  revisionNumber: number
  snapshot: Json
  submittedAt: string
  submittedBy: string
}

export type ProposalDecision = {
  action: 'approve' | 'request_edits' | 'deny'
  actorUserId: string
  commandId: string
  createdAt: string
  id: string
  ownerOverride: boolean
  proposalRevisionId: string
  reason: string | null
  revisionVersion: number
}

export type ProposalPersistence = {
  authorizeProducerDraft: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  authorizeReplacement: (input: {
    actorUserId: string
    proposalRevisionId: string
  }) => Promise<void>
  reviewRevision: (input: {
    action: 'approve' | 'request_edits' | 'deny'
    actorUserId: string
    commandId: string
    expectedVersion: number
    ownerOverride: boolean
    proposalRevisionId: string
    reason: string | null
  }) => Promise<ProposalDecision>
  saveProposedCast: (input: {
    actorUserId: string
    castMemberUserIds: string[]
    commandId: string
    eventId: string
  }) => Promise<{ castMemberUserIds: string[]; eventId: string }>
  submitRevision: (input: {
    actorUserId: string
    commandId: string
    eventId: string
  }) => Promise<ProposalRevision>
  seedReplacement: (input: {
    actorUserId: string
    commandId: string
    proposalRevisionId: string
    slug: string
    title: string
  }) => Promise<{ id: string; slug: string; theaterId: string; title: string }>
}

export function createSupabaseProposalPersistence(): ProposalPersistence {
  return {
    async authorizeReplacement(input) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const supabase = createSupabaseAnonClient(token)
      const { data, error } = await supabase
        .from('show_proposal_revisions')
        .select('decision_state, show_id')
        .eq('id', input.proposalRevisionId)
        .maybeSingle()
      if (error) {
        throw appError(
          'external_service_error',
          'Replacement Event authorization could not be checked.',
        )
      }
      if (!data) throw appError('not_found', 'Proposal Revision was not found.')
      if (data.decision_state !== 'denied') {
        throw appError(
          'conflict',
          'Only a denied Proposal Revision can seed a replacement Event.',
        )
      }
      const { data: isProducer, error: producerError } = await supabase.rpc(
        'is_show_producer',
        { p_show_id: data.show_id },
      )
      if (producerError) {
        throw appError(
          'external_service_error',
          'Replacement Event authorization could not be checked.',
        )
      }
      if (!isProducer) {
        throw appError(
          'forbidden',
          'Current source Event Producer access is required.',
        )
      }
    },
    async authorizeProducerDraft(input) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const supabase = createSupabaseAnonClient(token)
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
          'Proposal authorization could not be checked.',
        )
      }
      if (!event) throw appError('not_found', 'Event was not found.')
      if (!isProducer) {
        throw appError(
          'forbidden',
          'Eligible Event Producer access is required.',
        )
      }
      if (event.lifecycle_status !== 'draft') {
        throw appError('conflict', 'Only a draft Event can be submitted.')
      }
    },

    async saveProposedCast(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc('save_event_proposed_cast', {
        p_actor_user_id: input.actorUserId,
        p_cast_user_ids: input.castMemberUserIds,
        p_command_id: input.commandId,
        p_show_id: input.eventId,
      })

      if (error) throwProposalError(error)
      return { castMemberUserIds: data, eventId: input.eventId }
    },

    async reviewRevision(input) {
      // This mutation deliberately uses the signed-in actor's connection. The
      // transaction verifies auth.uid() against the command actor before it
      // rechecks current Reviewer authority and writes any decision fact.
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const supabase = createSupabaseAnonClient(token)
      const { data, error } = await supabase.rpc('review_proposal_revision', {
        p_action: input.action,
        p_actor_user_id: input.actorUserId,
        p_command_id: input.commandId,
        p_expected_version: input.expectedVersion,
        p_owner_override: input.ownerOverride,
        p_proposal_revision_id: input.proposalRevisionId,
        p_reason: input.reason ?? '',
      })
      if (error) throwProposalError(error)
      return {
        action: data.action,
        actorUserId: data.actor_user_id,
        commandId: data.command_id,
        createdAt: data.created_at,
        id: data.id,
        ownerOverride: data.owner_override,
        proposalRevisionId: data.proposal_revision_id,
        reason: data.reason,
        revisionVersion: data.revision_version,
      }
    },

    async seedReplacement(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'seed_denied_proposal_replacement',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_slug: input.slug,
          p_source_proposal_revision_id: input.proposalRevisionId,
          p_title: input.title,
        },
      )
      if (error) throwProposalError(error)
      return {
        id: data.id,
        slug: data.slug,
        theaterId: data.theater_id,
        title: data.title,
      }
    },

    async submitRevision(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'submit_event_proposal_revision',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_show_id: input.eventId,
        },
      )

      if (error) throwProposalError(error)
      return {
        commandId: data.command_id,
        decisionState: data.decision_state,
        eventId: data.show_id,
        id: data.id,
        revisionNumber: data.revision_number,
        snapshot: data.snapshot,
        submittedAt: data.submitted_at,
        submittedBy: data.submitted_by,
      }
    },
  }
}

function throwProposalError(error: {
  code?: string
  details?: string
  message: string
}): never {
  if (error.code === 'P0002') throw appError('not_found', error.message)
  if (error.code === '42501') throw appError('forbidden', error.message)
  if (error.code === '55000' || error.code === '23505') {
    throw appError('conflict', error.message)
  }
  if (error.code === '22023' || error.code === '23514') {
    let details: Json | undefined
    try {
      details = error.details ? (JSON.parse(error.details) as Json) : undefined
    } catch {
      details = undefined
    }
    throw appError('validation_error', error.message, details)
  }
  throw appError(
    'external_service_error',
    'Proposal Revision could not be saved.',
  )
}
