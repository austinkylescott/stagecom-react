import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseTheaterPersistence } from './persistence'
import { canManageTheater } from './permissions'
import { slugifyTheaterName } from './slug'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type { TheaterPersistence } from './persistence'
import type {
  createDraftTheaterInputSchema,
  publishTheaterInputSchema,
  setDefaultTheaterInputSchema,
  updateTheaterSetupInputSchema,
  uploadTheaterLogoInputSchema,
} from './schemas'

export type TheaterSummary = {
  id: string
  name: string
  slug: string
  status: 'draft' | 'published' | 'archived'
}

export type TheaterCommandDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: TheaterPersistence
}

function getDefaultDependencies(): TheaterCommandDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseTheaterPersistence(),
  }
}

export async function createDraftTheater(
  input: z.infer<typeof createDraftTheaterInputSchema>,
  dependencies: TheaterCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const result = await dependencies.persistence.createWithOwner({
      actorUserId: currentUser.data.id,
      name: input.name.trim(),
      slug: input.slug ?? slugifyTheaterName(input.name),
      ...(input.timezone ? { timezone: input.timezone.trim() } : {}),
    })

    return ok(result)
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError('external_service_error', 'Theater could not be created.'),
    )
  }
}

export async function updateTheaterSetup(
  input: z.infer<typeof updateTheaterSetupInputSchema>,
  dependencies: TheaterCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const access = await dependencies.persistence.findAuthorizedById({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!access) {
      return err(appError('not_found', 'Theater was not found.'))
    }

    if (!canManageTheater(access.roles)) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const theater = await dependencies.persistence.updateSetup({
      actorUserId: currentUser.data.id,
      changes: {
        ...(input.city === undefined ? {} : { city: input.city.trim() }),
        ...(input.country === undefined
          ? {}
          : { country: input.country.trim() }),
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.postalCode === undefined
          ? {}
          : { postalCode: input.postalCode.trim() }),
        ...(input.slug === undefined ? {} : { slug: input.slug }),
        ...(input.socialLinks === undefined
          ? {}
          : { socialLinks: input.socialLinks }),
        ...(input.stateRegion === undefined
          ? {}
          : { stateRegion: input.stateRegion.trim() }),
        ...(input.street === undefined ? {} : { street: input.street.trim() }),
        ...(input.tagline === undefined
          ? {}
          : { tagline: input.tagline.trim() }),
        ...(input.timezone === undefined
          ? {}
          : { timezone: input.timezone.trim() }),
        ...(input.websiteUrl === undefined
          ? {}
          : { websiteUrl: input.websiteUrl }),
      },
      theaterId: input.theaterId,
    })

    return ok({ theaterId: theater.id, slug: theater.slug })
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError('external_service_error', 'Theater setup could not be saved.'),
    )
  }
}

export async function uploadTheaterLogo(
  _input: z.infer<typeof uploadTheaterLogoInputSchema>,
) {
  return err(
    appError('internal_error', 'uploadTheaterLogo is not implemented.'),
  )
}

export async function publishTheater(
  input: z.infer<typeof publishTheaterInputSchema>,
  dependencies: TheaterCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const access = await dependencies.persistence.findAuthorizedById({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!access) {
      return err(appError('not_found', 'Theater was not found.'))
    }

    if (!canManageTheater(access.roles)) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    const missingFields = getMissingPublicationFields(access.theater)

    if (missingFields.length > 0) {
      return err(
        appError(
          'validation_error',
          'Complete the Theater profile before Publication.',
          { missingFields },
        ),
      )
    }

    const theater = await dependencies.persistence.publish({
      actorUserId: currentUser.data.id,
      theaterId: input.theaterId,
    })

    return ok({ published: true, slug: theater.slug, theaterId: theater.id })
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError('external_service_error', 'Theater could not be published.'),
    )
  }
}

export async function setDefaultTheater(
  input: z.infer<typeof setDefaultTheaterInputSchema>,
  dependencies: TheaterCommandDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const access = await dependencies.persistence.findAuthorizedById({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!access) {
      return err(
        appError('forbidden', 'Active Theater membership is required.'),
      )
    }

    const theater = await dependencies.persistence.setDefault({
      theaterId: input.theaterId,
      userId: currentUser.data.id,
    })

    if (!theater) {
      return err(
        appError('forbidden', 'Active Theater membership is required.'),
      )
    }

    return ok({ slug: theater.slug, theaterId: theater.id })
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError('external_service_error', 'Default Theater could not be saved.'),
    )
  }
}

function getMissingPublicationFields(theater: {
  city?: string
  country?: string
  name: string
  postalCode?: string
  slug: string
  stateRegion?: string
  street?: string
  tagline?: string
  timezone?: string
}) {
  const fields: Array<[string, string | undefined]> = [
    ['name', theater.name],
    ['slug', theater.slug],
    ['tagline', theater.tagline],
    ['street', theater.street],
    ['city', theater.city],
    ['stateRegion', theater.stateRegion],
    ['postalCode', theater.postalCode],
    ['country', theater.country],
    ['timezone', theater.timezone],
  ]

  return fields.filter(([, value]) => !value?.trim()).map(([field]) => field)
}
