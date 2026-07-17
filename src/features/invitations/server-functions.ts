import { createServerFn } from '@tanstack/react-start'

import {
  acceptTargetedInvitation,
  createTargetedInvitation,
  revokeTargetedInvitation,
} from './commands'
import {
  getTargetedInvitationPreview,
  listTargetedInvitations,
} from './queries'
import {
  acceptTargetedInvitationInputSchema,
  createTargetedInvitationInputSchema,
  listTargetedInvitationsInputSchema,
  revokeTargetedInvitationInputSchema,
  targetedInvitationPreviewInputSchema,
} from './schemas'

export const createTargetedInvitationFn = createServerFn({ method: 'POST' })
  .validator(createTargetedInvitationInputSchema)
  .handler(async ({ data }) => createTargetedInvitation(data))

export const revokeTargetedInvitationFn = createServerFn({ method: 'POST' })
  .validator(revokeTargetedInvitationInputSchema)
  .handler(async ({ data }) => revokeTargetedInvitation(data))

export const acceptTargetedInvitationFn = createServerFn({ method: 'POST' })
  .validator(acceptTargetedInvitationInputSchema)
  .handler(async ({ data }) => acceptTargetedInvitation(data))

export const getTargetedInvitationPreviewFn = createServerFn({ method: 'GET' })
  .validator(targetedInvitationPreviewInputSchema)
  .handler(async ({ data }) => getTargetedInvitationPreview(data))

export const listTargetedInvitationsFn = createServerFn({ method: 'GET' })
  .validator(listTargetedInvitationsInputSchema)
  .handler(async ({ data }) => listTargetedInvitations(data))
