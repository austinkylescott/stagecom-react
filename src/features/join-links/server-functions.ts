import { createServerFn } from '@tanstack/react-start'

import {
  acceptReusableJoinLink,
  createReusableJoinLink,
  revokeReusableJoinLink,
  rotateReusableJoinLink,
} from './commands'
import { getReusableJoinLinkPreview, listReusableJoinLinks } from './queries'
import {
  acceptReusableJoinLinkInputSchema,
  createReusableJoinLinkInputSchema,
  joinLinkIdInputSchema,
  listReusableJoinLinksInputSchema,
  reusableJoinLinkPreviewInputSchema,
} from './schemas'

export const createReusableJoinLinkFn = createServerFn({ method: 'POST' })
  .validator(createReusableJoinLinkInputSchema)
  .handler(async ({ data }) => createReusableJoinLink(data))

export const revokeReusableJoinLinkFn = createServerFn({ method: 'POST' })
  .validator(joinLinkIdInputSchema)
  .handler(async ({ data }) => revokeReusableJoinLink(data))

export const rotateReusableJoinLinkFn = createServerFn({ method: 'POST' })
  .validator(joinLinkIdInputSchema)
  .handler(async ({ data }) => rotateReusableJoinLink(data))

export const acceptReusableJoinLinkFn = createServerFn({ method: 'POST' })
  .validator(acceptReusableJoinLinkInputSchema)
  .handler(async ({ data }) => acceptReusableJoinLink(data))

export const getReusableJoinLinkPreviewFn = createServerFn({ method: 'GET' })
  .validator(reusableJoinLinkPreviewInputSchema)
  .handler(async ({ data }) => getReusableJoinLinkPreview(data))

export const listReusableJoinLinksFn = createServerFn({ method: 'GET' })
  .validator(listReusableJoinLinksInputSchema)
  .handler(async ({ data }) => listReusableJoinLinks(data))
