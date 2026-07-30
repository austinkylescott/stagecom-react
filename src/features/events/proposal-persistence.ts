import { getBearerTokenFromRequest } from '@/server/auth/session'
import { appError } from '@/server/errors'
import { z } from 'zod'
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

export type ProposalCounteroffer = {
  actorUserId: string
  candidateSlotId: string
  commandId: string
  createdAt: string
  id: string
  occurrenceId: string
  proposalRevisionId: string
  responseDeadline: string
  state: 'pending' | 'accepted' | 'declined' | 'expired'
}

export type ProposalPersistence = {
  authorizeCounterofferResponse: (input: {
    actorUserId: string
    counterofferId: string
  }) => Promise<void>
  authorizeProducerDraft: (input: {
    actorUserId: string
    eventId: string
  }) => Promise<void>
  authorizeReplacement: (input: {
    actorUserId: string
    proposalRevisionId: string
  }) => Promise<void>
  expireCounteroffers: (input: {
    eventId?: string
    now: string
  }) => Promise<number>
  issueCounteroffer: (input: {
    actorUserId: string
    commandId: string
    durationMinutes: number
    expectedVersion: number
    localStartsAt: string
    locationKind: 'primary_venue' | 'off_site'
    locationName: string
    now: string
    occurrenceId: string
    proposalRevisionId: string
    responseDeadline?: string
    startsAt: string
    timezoneName: string
    timezoneSource: 'manual'
    utcOffsetMinutes: number
  }) => Promise<ProposalCounteroffer>
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
  respondToCounteroffer: (input: {
    actorUserId: string
    commandId: string
    counterofferId: string
    now: string
    response: 'accept' | 'decline'
  }) => Promise<{
    counterofferId: string
    proposalRevision: ProposalRevision | null
    response: 'accept' | 'decline'
    respondedAt: string
  }>
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
    async authorizeCounterofferResponse(input) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const supabase = createSupabaseAnonClient(token)
      const { data: canRespond, error } = await supabase.rpc(
        'can_respond_to_proposal_counteroffer',
        { p_counteroffer_id: input.counterofferId },
      )
      if (error) {
        throw appError(
          'external_service_error',
          'Counteroffer authorization could not be checked.',
        )
      }
      if (!canRespond) {
        throw appError(
          'forbidden',
          'Current Event Producer access is required.',
        )
      }
    },
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

    async expireCounteroffers(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'expire_proposal_counteroffers',
        {
          p_now: input.now,
          ...(input.eventId ? { p_show_id: input.eventId } : {}),
        },
      )
      if (error) throwProposalError(error)
      return data
    },

    async issueCounteroffer(input) {
      const token = getBearerTokenFromRequest()
      if (!token) throw appError('unauthenticated', 'Sign in is required.')
      const supabase = createSupabaseAnonClient(token)
      const { data, error } = await supabase.rpc(
        'issue_proposal_counteroffer',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_duration_minutes: input.durationMinutes,
          p_expected_version: input.expectedVersion,
          p_local_starts_at: input.localStartsAt,
          p_location_kind: input.locationKind,
          p_location_name: input.locationName,
          p_now: input.now,
          p_occurrence_id: input.occurrenceId,
          p_proposal_revision_id: input.proposalRevisionId,
          ...(input.responseDeadline
            ? { p_response_deadline: input.responseDeadline }
            : {}),
          p_starts_at: input.startsAt,
          p_timezone_name: input.timezoneName,
          p_timezone_source: input.timezoneSource,
          p_utc_offset_minutes: input.utcOffsetMinutes,
        },
      )
      if (error) throwProposalError(error)
      return mapCounteroffer(data)
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

    async respondToCounteroffer(input) {
      const supabase = createSupabaseServiceRoleClient()
      const { data, error } = await supabase.rpc(
        'respond_to_proposal_counteroffer',
        {
          p_actor_user_id: input.actorUserId,
          p_command_id: input.commandId,
          p_counteroffer_id: input.counterofferId,
          p_now: input.now,
          p_response: input.response,
        },
      )
      if (error) throwProposalError(error)
      const response = counterofferResponseSchema.parse(data)
      return {
        counterofferId: response.counterofferId,
        proposalRevision: response.proposalRevision
          ? {
              commandId: response.proposalRevision.command_id,
              decisionState: response.proposalRevision.decision_state,
              eventId: response.proposalRevision.show_id,
              id: response.proposalRevision.id,
              revisionNumber: response.proposalRevision.revision_number,
              snapshot: response.proposalRevision.snapshot,
              submittedAt: response.proposalRevision.submitted_at,
              submittedBy: response.proposalRevision.submitted_by,
            }
          : null,
        response: response.response,
        respondedAt: response.respondedAt,
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
  if (
    error.code === '55000' ||
    error.code === '23505' ||
    error.code === '23P01'
  ) {
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

function mapCounteroffer(data: {
  actor_user_id: string
  candidate_slot_id: string
  command_id: string
  created_at: string
  id: string
  occurrence_id: string
  proposal_revision_id: string
  response_deadline: string
  state: ProposalCounteroffer['state']
}): ProposalCounteroffer {
  return {
    actorUserId: data.actor_user_id,
    candidateSlotId: data.candidate_slot_id,
    commandId: data.command_id,
    createdAt: data.created_at,
    id: data.id,
    occurrenceId: data.occurrence_id,
    proposalRevisionId: data.proposal_revision_id,
    responseDeadline: data.response_deadline,
    state: data.state,
  }
}

const counterofferResponseSchema = z.object({
  counterofferId: z.uuid(),
  proposalRevision: z
    .object({
      command_id: z.uuid(),
      decision_state: z.enum([
        'pending',
        'changes_requested',
        'counteroffered',
        'approved',
        'denied',
      ]),
      id: z.uuid(),
      revision_number: z.number().int().positive(),
      show_id: z.uuid(),
      snapshot: z.custom<Json>(),
      submitted_at: z.string(),
      submitted_by: z.uuid(),
    })
    .nullable(),
  respondedAt: z.string(),
  response: z.enum(['accept', 'decline']),
})
