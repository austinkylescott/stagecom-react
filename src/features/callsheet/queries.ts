import { appError, err, ok } from '@/server/errors'
import { createSupabaseServiceRoleClient } from '@/server/supabase/client'

import { getEventCommitments } from './event-commitments'
import { createCallsheetReadModel } from './read-model'
import { getMySharedTheaterWork } from './shared-work'

export async function getMyCallsheet() {
  const sharedResult = await getMySharedTheaterWork()
  if (!sharedResult.ok) return sharedResult
  const { actorUserId, theaters, sharedWork } = sharedResult.data
  const theaterById = new Map(theaters.map((theater) => [theater.id, theater]))

  if (theaters.length === 0)
    return ok({ commitments: [], sharedWork, theaters })

  const supabase = createSupabaseServiceRoleClient()
  const { data: adminInvitations, error: adminInvitationError } = await supabase
    .from('admin_invitations')
    .select('id, theater_id')
    .eq('member_user_id', actorUserId)
    .eq('status', 'pending')
    .in(
      'theater_id',
      theaters.map((theater) => theater.id),
    )

  if (adminInvitationError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const adminCommitments = adminInvitations.flatMap((invitation) => {
    const theater = theaterById.get(invitation.theater_id)
    if (!theater) return []
    return [
      {
        action: 'Respond to Admin invitation',
        actionableAt: null,
        event: { slug: '', title: 'Admin authority invitation' },
        id: `admin-invitation:${invitation.id}`,
        responseId: invitation.id,
        kind: 'admin_invitation' as const,
        relationship: 'Theater Member',
        targetAnchor: '',
        theater: { slug: theater.slug, title: theater.name },
      },
    ]
  })

  const { data: ownershipTransfers, error: ownershipTransferError } =
    await supabase
      .from('theater_ownership_transfers')
      .select('id, theater_id')
      .eq('member_user_id', actorUserId)
      .eq('status', 'pending')
      .in(
        'theater_id',
        theaters.map((theater) => theater.id),
      )

  if (ownershipTransferError) {
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  }

  const ownershipTransferCommitments = ownershipTransfers.flatMap(
    (transfer) => {
      const theater = theaterById.get(transfer.theater_id)
      if (!theater) return []
      return [
        {
          action: 'Respond to ownership transfer',
          actionableAt: null,
          event: { slug: '', title: 'Theater ownership transfer' },
          id: `ownership-transfer:${transfer.id}`,
          responseId: transfer.id,
          kind: 'ownership_transfer' as const,
          relationship: 'Proposed successor',
          targetAnchor: '',
          theater: { slug: theater.slug, title: theater.name },
        },
      ]
    },
  )

  const eventCommitments = await getEventCommitments({ actorUserId, theaters })
  if (!eventCommitments.ok) return eventCommitments
  return ok({
    ...createCallsheetReadModel({
      commitments: [
        ...adminCommitments,
        ...ownershipTransferCommitments,
        ...eventCommitments.data,
      ],
      sharedWork,
    }),
    theaters,
  })
}
