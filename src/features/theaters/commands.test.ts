import { describe, expect, it } from 'vitest'

import {
  createDraftTheater,
  publishTheater,
  setDefaultTheater,
  updateTheaterSetup,
} from './commands'
import { getPublishedTheaterBySlug } from './public-queries'
import { getMyTheaters, getTheaterPreview } from './queries'

import type { TheaterCommandDependencies } from './commands'
import type { TheaterQueryDependencies } from './queries'
import type { PublicTheaterQueryDependencies } from './public-queries'

describe('Theater commands', () => {
  it('creates one persistent Theater with its Owner membership when retried', async () => {
    const harness = createTheaterHarness()
    const input = {
      name: 'Main Stage Theater',
      slug: 'main-stage',
      timezone: 'America/Chicago',
    }

    const first = await createDraftTheater(input, harness.dependencies)
    const retry = await createDraftTheater(input, harness.dependencies)

    expect(first).toEqual({
      ok: true,
      data: {
        created: true,
        theater: {
          id: 'theater-1',
          name: 'Main Stage Theater',
          slug: 'main-stage',
          status: 'draft',
        },
      },
    })
    expect(retry).toEqual({
      ok: true,
      data: {
        created: false,
        theater: {
          id: 'theater-1',
          name: 'Main Stage Theater',
          slug: 'main-stage',
          status: 'draft',
        },
      },
    })
    expect(harness.snapshot()).toEqual({
      activities: ['theater.created'],
      memberships: [
        {
          isHome: true,
          roles: ['owner'],
          theaterId: 'theater-1',
          userId: 'user-1',
        },
      ],
      theaters: ['theater-1'],
    })
  })

  it('lets an Owner persist and preview an unpublished public identity', async () => {
    const harness = createTheaterHarness()
    await createDraftTheater(
      { name: 'Main Stage Theater', slug: 'main-stage' },
      harness.dependencies,
    )

    const update = await updateTheaterSetup(
      {
        theaterId: 'theater-1',
        city: 'Austin',
        country: 'United States',
        name: 'Main Stage Theater',
        postalCode: '78701',
        slug: 'main-stage',
        stateRegion: 'TX',
        street: '123 Main Street',
        tagline: 'A home for organized productions',
        timezone: 'America/Chicago',
        websiteUrl: 'https://mainstage.example',
      },
      harness.dependencies,
    )
    const preview = await getTheaterPreview(
      { theaterSlug: 'main-stage' },
      harness.dependencies,
    )

    expect(update).toEqual({
      ok: true,
      data: { theaterId: 'theater-1', slug: 'main-stage' },
    })
    expect(preview).toEqual({
      ok: true,
      data: {
        theater: {
          location: {
            city: 'Austin',
            country: 'United States',
            postalCode: '78701',
            stateRegion: 'TX',
            street: '123 Main Street',
          },
          name: 'Main Stage Theater',
          slug: 'main-stage',
          socialLinks: [],
          tagline: 'A home for organized productions',
          upcomingEvents: [],
          websiteUrl: 'https://mainstage.example',
        },
        timezone: 'America/Chicago',
      },
    })
  })

  it('publishes a complete Theater once and keeps drafts anonymous', async () => {
    const harness = createTheaterHarness()
    await createDraftTheater(
      { name: 'Main Stage Theater', slug: 'main-stage' },
      harness.dependencies,
    )

    const hiddenDraft = await getPublishedTheaterBySlug(
      { theaterSlug: 'main-stage' },
      harness.dependencies,
    )
    const blocked = await publishTheater(
      { theaterId: 'theater-1' },
      harness.dependencies,
    )

    expect(hiddenDraft).toEqual({
      ok: false,
      error: {
        code: 'not_found',
        message: 'Theater was not found.',
        status: 404,
      },
    })
    expect(blocked).toEqual({
      ok: false,
      error: {
        code: 'validation_error',
        details: {
          missingFields: [
            'tagline',
            'street',
            'city',
            'stateRegion',
            'postalCode',
            'country',
            'timezone',
          ],
        },
        message: 'Complete the Theater profile before Publication.',
        status: 400,
      },
    })

    await updateTheaterSetup(
      {
        theaterId: 'theater-1',
        city: 'Austin',
        country: 'United States',
        postalCode: '78701',
        stateRegion: 'TX',
        street: '123 Main Street',
        tagline: 'A home for organized productions',
        timezone: 'America/Chicago',
      },
      harness.dependencies,
    )
    const published = await publishTheater(
      { theaterId: 'theater-1' },
      harness.dependencies,
    )
    const retry = await publishTheater(
      { theaterId: 'theater-1' },
      harness.dependencies,
    )
    const publicResult = await getPublishedTheaterBySlug(
      { theaterSlug: 'main-stage' },
      harness.dependencies,
    )

    expect(published).toEqual({
      ok: true,
      data: { published: true, slug: 'main-stage', theaterId: 'theater-1' },
    })
    expect(retry).toEqual(published)
    expect(publicResult).toEqual({
      ok: true,
      data: {
        theater: {
          location: {
            city: 'Austin',
            country: 'United States',
            postalCode: '78701',
            stateRegion: 'TX',
            street: '123 Main Street',
          },
          name: 'Main Stage Theater',
          slug: 'main-stage',
          socialLinks: [],
          tagline: 'A home for organized productions',
          upcomingEvents: [],
        },
      },
    })
    expect(harness.snapshot().activities).toEqual([
      'theater.created',
      'theater.published',
    ])
  })

  it('lets a Member choose one default Theater for navigation', async () => {
    const harness = createTheaterHarness()
    await createDraftTheater(
      { name: 'Main Stage', slug: 'main-stage' },
      harness.dependencies,
    )
    await createDraftTheater(
      { name: 'Side Stage', slug: 'side-stage' },
      harness.dependencies,
    )

    const selected = await setDefaultTheater(
      { theaterId: 'theater-2' },
      harness.dependencies,
    )
    const theaters = await getMyTheaters(harness.dependencies)

    expect(selected).toEqual({
      ok: true,
      data: { slug: 'side-stage', theaterId: 'theater-2' },
    })
    expect(theaters).toEqual({
      ok: true,
      data: {
        theaters: [
          {
            id: 'theater-2',
            isDefault: true,
            name: 'Side Stage',
            slug: 'side-stage',
            status: 'draft',
          },
          {
            id: 'theater-1',
            isDefault: false,
            name: 'Main Stage',
            slug: 'main-stage',
            status: 'draft',
          },
        ],
      },
    })
  })
})

function createTheaterHarness() {
  const theaters = new Map<
    string,
    {
      id: string
      name: string
      slug: string
      status: 'draft' | 'published'
      city?: string
      country?: string
      postalCode?: string
      stateRegion?: string
      street?: string
      tagline?: string
      timezone?: string
      websiteUrl?: string
    }
  >()
  const memberships: Array<{
    isHome: boolean
    roles: ['owner']
    theaterId: string
    userId: string
  }> = []
  const activities: string[] = []

  const dependencies: TheaterCommandDependencies &
    TheaterQueryDependencies &
    PublicTheaterQueryDependencies = {
    getCurrentUser: async () => ({
      ok: true,
      data: { id: 'user-1' },
    }),
    persistence: {
      createWithOwner: async (input) => {
        const existing = [...theaters.values()].find(
          (theater) => theater.slug === input.slug,
        )

        if (existing) {
          return { created: false, theater: existing }
        }

        const theater = {
          id: `theater-${theaters.size + 1}`,
          name: input.name,
          slug: input.slug,
          status: 'draft' as const,
        }
        theaters.set(theater.id, theater)
        memberships.push({
          isHome: memberships.length === 0,
          roles: ['owner'],
          theaterId: theater.id,
          userId: input.actorUserId,
        })
        activities.push('theater.created')

        return { created: true, theater }
      },
      findAuthorizedById: async ({ theaterId, userId }) => {
        const membership = memberships.find(
          (candidate) =>
            candidate.theaterId === theaterId && candidate.userId === userId,
        )
        const theater = theaters.get(theaterId)

        return membership && theater
          ? { roles: membership.roles, theater }
          : null
      },
      findAuthorizedBySlug: async ({ theaterSlug, userId }) => {
        const theater = [...theaters.values()].find(
          (candidate) => candidate.slug === theaterSlug,
        )
        const membership = memberships.find(
          (candidate) =>
            candidate.theaterId === theater?.id && candidate.userId === userId,
        )

        return membership && theater
          ? { roles: membership.roles, theater }
          : null
      },
      findPublishedBySlug: async ({ theaterSlug }) => {
        return (
          [...theaters.values()].find(
            (candidate) =>
              candidate.slug === theaterSlug &&
              candidate.status === 'published',
          ) ?? null
        )
      },
      listForUser: async ({ userId }) => {
        return memberships
          .filter((membership) => membership.userId === userId)
          .map((membership) => ({
            isDefault: membership.isHome,
            theater: theaters.get(membership.theaterId)!,
          }))
          .sort(
            (left, right) => Number(right.isDefault) - Number(left.isDefault),
          )
      },
      publish: async ({ theaterId }) => {
        const theater = theaters.get(theaterId)

        if (!theater) {
          throw new Error('Missing Theater')
        }

        if (theater.status !== 'published') {
          theater.status = 'published'
          activities.push('theater.published')
        }

        return theater
      },
      setDefault: async ({ theaterId, userId }) => {
        const membership = memberships.find(
          (candidate) =>
            candidate.theaterId === theaterId && candidate.userId === userId,
        )

        if (!membership) {
          return null
        }

        for (const candidate of memberships) {
          if (candidate.userId === userId) {
            candidate.isHome = candidate === membership
          }
        }

        return theaters.get(theaterId) ?? null
      },
      updateSetup: async (input) => {
        const theater = theaters.get(input.theaterId)

        if (!theater) {
          throw new Error('Missing Theater')
        }

        Object.assign(theater, input.changes)
        return theater
      },
    },
  }

  return {
    dependencies,
    snapshot: () => ({
      activities,
      memberships,
      theaters: [...theaters.keys()],
    }),
  }
}
