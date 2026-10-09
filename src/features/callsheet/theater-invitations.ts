import { appError, err, ok } from '@/server/errors'
import {
  createSupabaseAnonClient,
  createSupabaseServiceRoleClient,
} from '@/server/supabase/client'
import type { CallsheetCommitmentInput } from './read-model'

/** Verify the recipient and active memberships before enriching their pending offers. */
export async function getMyTheaterInvitations({
  accessToken,
}: {
  accessToken: string
}) {
  const actor = createSupabaseAnonClient(accessToken)
  const { data: identity, error: identityError } =
    await actor.auth.getUser(accessToken)
  if (identityError)
    return err(appError('unauthenticated', 'Sign in is required.'))
  const { data: memberships, error: membershipError } = await actor
    .from('theater_memberships')
    .select('theater_id, theaters!inner(name, slug)')
    .eq('user_id', identity.user.id)
    .eq('status', 'active')
  if (membershipError)
    return err(
      appError('external_service_error', 'Callsheet could not be loaded.'),
    )
  const theaters = memberships.map((row) => ({
    id: row.theater_id,
    ...row.theaters,
  }))
  if (!theaters.length) return ok([] as CallsheetCommitmentInput[])
  const theaterById = new Map(theaters.map((theater) => [theater.id, theater]))
  const supabase = createSupabaseServiceRoleClient()
  const { data: adminInvitations, error: adminInvitationError } = await supabase
    .from('admin_invitations')
    .select(
      'id, theater_id, created_at, inviter:profiles!admin_invitations_invited_by_user_id_fkey(display_name, deleted_at)',
    )
    .eq('member_user_id', identity.user.id)
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
        invitation: {
          offeredBy: invitation.inviter.deleted_at
            ? null
            : invitation.inviter.display_name || null,
          offeredAt: invitation.created_at,
        },
        relationship: 'Theater Member',
        targetAnchor: '',
        theater: { slug: theater.slug, title: theater.name },
      },
    ]
  })

  const { data: ownershipTransfers, error: ownershipTransferError } =
    await supabase
      .from('theater_ownership_transfers')
      .select(
        'id, theater_id, created_at, former_owner_role, proposer:profiles!theater_ownership_transfers_proposed_by_user_id_fkey(display_name, deleted_at)',
      )
      .eq('member_user_id', identity.user.id)
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
          invitation: {
            offeredBy: transfer.proposer.deleted_at
              ? null
              : transfer.proposer.display_name || null,
            offeredAt: transfer.created_at,
            formerOwnerRole:
              transfer.former_owner_role === 'admin' ||
              transfer.former_owner_role === 'member'
                ? transfer.former_owner_role
                : null,
          },
          relationship: 'Proposed successor',
          targetAnchor: '',
          theater: { slug: theater.slug, title: theater.name },
        },
      ]
    },
  )

  return ok<CallsheetCommitmentInput[]>([
    ...adminCommitments,
    ...ownershipTransferCommitments,
  ])
}
