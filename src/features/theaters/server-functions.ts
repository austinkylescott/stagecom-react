import { createServerFn } from '@tanstack/react-start'

import {
  createDraftTheater,
  createTheaterInvite,
  publishTheater,
  setDefaultTheater,
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
  setDefaultTheaterInputSchema,
  theaterSlugInputSchema,
  updateTheaterSetupInputSchema,
  uploadTheaterLogoInputSchema,
} from './schemas'

export const createDraftTheaterFn = createServerFn({ method: 'POST' })
  .validator(createDraftTheaterInputSchema)
  .handler(async ({ data }) => createDraftTheater(data))

export const updateTheaterSetupFn = createServerFn({ method: 'POST' })
  .validator(updateTheaterSetupInputSchema)
  .handler(async ({ data }) => updateTheaterSetup(data))

export const uploadTheaterLogoFn = createServerFn({ method: 'POST' })
  .validator(uploadTheaterLogoInputSchema)
  .handler(async ({ data }) => uploadTheaterLogo(data))

export const publishTheaterFn = createServerFn({ method: 'POST' })
  .validator(publishTheaterInputSchema)
  .handler(async ({ data }) => publishTheater(data))

export const setDefaultTheaterFn = createServerFn({ method: 'POST' })
  .validator(setDefaultTheaterInputSchema)
  .handler(async ({ data }) => setDefaultTheater(data))

export const createTheaterInviteFn = createServerFn({ method: 'POST' })
  .validator(createTheaterInviteInputSchema)
  .handler(async ({ data }) => createTheaterInvite(data))

export const getMyTheatersFn = createServerFn({ method: 'GET' }).handler(
  async () => getMyTheaters(),
)

export const getTheaterPreviewFn = createServerFn({ method: 'GET' })
  .validator(theaterSlugInputSchema)
  .handler(async ({ data }) => getTheaterPreview(data))

export const getPublishedTheaterBySlugFn = createServerFn({
  method: 'GET',
})
  .validator(theaterSlugInputSchema)
  .handler(async ({ data }) => getPublishedTheaterBySlug(data))

export const getPublishedTheaterEventsFn = createServerFn({ method: 'GET' })
  .validator(publishedTheaterEventsInputSchema)
  .handler(async ({ data }) => getPublishedTheaterEvents(data))
