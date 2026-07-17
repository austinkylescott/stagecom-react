import { err, ok, toAppError } from '@/server/errors'
import { inviteTokenSchema } from '@/server/schemas'

import { hashInvitationToken } from '../invitations/tokens'
import { createSupabaseJoinLinkPersistence } from './persistence'

import type { ReusableJoinLinkPersistence } from './persistence'

export type ReusableJoinLinkView =
  | { state: 'active'; theaterName: string }
  | { state: 'exhausted' | 'expired' | 'invalid' | 'revoked' }

type PreviewDependencies = {
  hashToken: (token: string) => Promise<string>
  persistence: Pick<ReusableJoinLinkPersistence, 'preview'>
}

export async function getReusableJoinLinkPreview(
  input: { joinToken: string },
  dependencies: PreviewDependencies = {
    hashToken: hashInvitationToken,
    persistence: createSupabaseJoinLinkPersistence(),
  },
) {
  if (!inviteTokenSchema.safeParse(input.joinToken).success) {
    return ok({ state: 'invalid' as const })
  }

  try {
    const tokenHash = await dependencies.hashToken(input.joinToken)
    const preview = await dependencies.persistence.preview({ tokenHash })

    if (preview.result === 'active' && preview.theaterName) {
      return ok({
        state: 'active' as const,
        theaterName: preview.theaterName,
      })
    }

    return ok({
      state:
        preview.result === 'active' ? ('invalid' as const) : preview.result,
    })
  } catch (error) {
    return err(toAppError(error))
  }
}
