import { createServerFn } from '@tanstack/react-start'

import {
  createDraftTheater,
  createTheaterInvite,
  publishTheater,
  updateTheaterSetup,
  uploadTheaterLogo,
} from './commands'
import {
  getPublishedTheaterBySlug,
  getPublishedTheaterEvents,
} from './public-queries'
import { getMyTheaters, getTheaterPreview } from './queries'
import {
  createDraftTheaterInputSchema,
  createTheaterInviteInputSchema,
  publishedTheaterEventsInputSchema,
  publishTheaterInputSchema,
  theaterSlugInputSchema,
  updateTheaterSetupInputSchema,
  uploadTheaterLogoInputSchema,
} from './schemas'

export const createDraftTheaterFn = createServerFn({ method: 'POST' })
  .inputValidator(createDraftTheaterInputSchema)
  .handler(async ({ data }) => createDraftTheater(data))

export const updateTheaterSetupFn = createServerFn({ method: 'POST' })
  .inputValidator(updateTheaterSetupInputSchema)
  .handler(async ({ data }) => updateTheaterSetup(data))

export const uploadTheaterLogoFn = createServerFn({ method: 'POST' })
  .inputValidator(uploadTheaterLogoInputSchema)
  .handler(async ({ data }) => uploadTheaterLogo(data))

export const publishTheaterFn = createServerFn({ method: 'POST' })
  .inputValidator(publishTheaterInputSchema)
  .handler(async ({ data }) => publishTheater(data))

export const createTheaterInviteFn = createServerFn({ method: 'POST' })
  .inputValidator(createTheaterInviteInputSchema)
  .handler(async ({ data }) => createTheaterInvite(data))

export const getMyTheatersFn = createServerFn({ method: 'GET' }).handler(
  async () => getMyTheaters(),
)

export const getTheaterPreviewFn = createServerFn({ method: 'GET' })
  .inputValidator(theaterSlugInputSchema)
  .handler(async ({ data }) => getTheaterPreview(data))

export const getPublishedTheaterBySlugFn = createServerFn({
  method: 'GET',
})
  .inputValidator(theaterSlugInputSchema)
  .handler(async ({ data }) => getPublishedTheaterBySlug(data))

export const getPublishedTheaterEventsFn = createServerFn({ method: 'GET' })
  .inputValidator(publishedTheaterEventsInputSchema)
  .handler(async ({ data }) => getPublishedTheaterEvents(data))
