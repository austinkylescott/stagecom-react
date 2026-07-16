import { getCurrentUserFromRequest } from '@/server/auth/session'
import { appError, err, ok, toAppError } from '@/server/errors'

import { createSupabaseTheaterPersistence } from './persistence'
import { canManageTheater } from './permissions'

import type { z } from 'zod'
import type { AppResult } from '@/server/errors'
import type { TheaterPersistence, TheaterRecord } from './persistence'
import type { theaterSlugInputSchema } from './schemas'

export type TheaterQueryDependencies = {
  getCurrentUser: () => Promise<AppResult<{ id: string }>>
  persistence: TheaterPersistence
}

function getDefaultDependencies(): TheaterQueryDependencies {
  return {
    getCurrentUser: getCurrentUserFromRequest,
    persistence: createSupabaseTheaterPersistence(),
  }
}

export async function getMyTheaters(
  dependencies: TheaterQueryDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const memberships = await dependencies.persistence.listForUser({
      userId: currentUser.data.id,
    })

    return ok({
      theaters: memberships.map(({ isDefault, theater }) => ({
        id: theater.id,
        isDefault,
        name: theater.name,
        slug: theater.slug,
        status: theater.status,
      })),
    })
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError('external_service_error', 'Theaters could not be loaded.'),
    )
  }
}

export async function getTheaterPreview(
  input: z.infer<typeof theaterSlugInputSchema>,
  dependencies: TheaterQueryDependencies = getDefaultDependencies(),
) {
  const currentUser = await dependencies.getCurrentUser()

  if (!currentUser.ok) {
    return currentUser
  }

  try {
    const access = await dependencies.persistence.findAuthorizedBySlug({
      theaterSlug: input.theaterSlug,
      userId: currentUser.data.id,
    })

    if (!access) {
      return err(appError('not_found', 'Theater was not found.'))
    }

    if (!canManageTheater(access.roles)) {
      return err(appError('forbidden', 'Owner or Admin access is required.'))
    }

    return ok({
      theater: toPublicTheaterView(access.theater),
      timezone: access.theater.timezone ?? '',
    })
  } catch (error) {
    const appFailure = toAppError(error)

    if (appFailure.code !== 'internal_error') {
      return err(appFailure)
    }

    return err(
      appError(
        'external_service_error',
        'Theater preview could not be loaded.',
      ),
    )
  }
}

export function toPublicTheaterView(theater: TheaterRecord) {
  return {
    location: {
      city: theater.city ?? '',
      country: theater.country ?? '',
      postalCode: theater.postalCode ?? '',
      stateRegion: theater.stateRegion ?? '',
      street: theater.street ?? '',
    },
    name: theater.name,
    slug: theater.slug,
    socialLinks: Object.entries(theater.socialLinks ?? {}).map(
      ([label, url]) => ({ label, url }),
    ),
    tagline: theater.tagline ?? '',
    upcomingEvents: [],
    ...(theater.logoUrl ? { logoUrl: theater.logoUrl } : {}),
    ...(theater.websiteUrl ? { websiteUrl: theater.websiteUrl } : {}),
  }
}
