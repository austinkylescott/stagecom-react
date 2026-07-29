import { describe, expect, it } from 'vitest'

import { saveEventPublicContent } from './commands'
import { evaluatePublicReadiness } from './public-content-queries'
import { getPublishedEventBySlug } from './public-queries'
import { saveEventPublicContentInputSchema } from './schemas'

import type { EventPublicContentCommandDependencies } from './commands'
import type { EventPublicContentPersistence } from './public-content-persistence'

const eventId = '10000000-0000-4000-8000-000000000001'
const castUserId = '20000000-0000-4000-8000-000000000001'
const commandId = '30000000-0000-4000-8000-000000000001'

describe('versioned public Event content', () => {
  it('authorizes the Producer before saving an unpublished revision', async () => {
    const calls: string[] = []
    const persistence: EventPublicContentPersistence = {
      authorizeEdit: async () => {
        calls.push('authorize')
      },
      findPublishedBySlug: async () => null,
      saveDraft: async (input) => {
        calls.push('save')
        return {
          admissionPriceCents: input.admissionPriceCents,
          castCredits: [
            {
              displayName: 'Cast Member',
              ...input.castCredits[0],
            },
          ],
          description: input.description,
          externalUrl: input.externalUrl,
          id: '40000000-0000-0000-0000-000000000001',
          imageUrl: input.imageUrl,
          publishedAt: null,
          revisionNumber: 1,
          salesChannel: input.salesChannel,
          title: input.title,
          version: 1,
        }
      },
    }
    const dependencies: EventPublicContentCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'producer-1' } }),
      persistence,
    }

    const result = await saveEventPublicContent(
      {
        admissionPriceCents: 0,
        castCredits: [
          { position: 0, publiclyCredited: false, userId: castUserId },
        ],
        commandId,
        description: '  A public description.  ',
        eventId,
        expectedVersion: null,
        externalUrl: null,
        imageUrl: 'https://images.example/event.jpg',
        salesChannel: 'no_advance_ticketing',
        title: '  Public title  ',
      },
      dependencies,
    )

    expect(result.ok).toBe(true)
    expect(calls).toEqual(['authorize', 'save'])
    if (result.ok) {
      expect(result.data).toMatchObject({
        admissionPriceCents: 0,
        externalUrl: null,
        publishedAt: null,
        title: 'Public title',
      })
    }
  })

  it('does not save when Producer authorization fails', async () => {
    let saved = false
    const dependencies: EventPublicContentCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
        authorizeEdit: async () => {
          throw {
            code: 'forbidden',
            message: 'Eligible Event Producer access is required.',
            status: 403,
          }
        },
        findPublishedBySlug: async () => null,
        saveDraft: async () => {
          saved = true
          throw new Error('must not run')
        },
      },
    }

    const result = await saveEventPublicContent(
      {
        admissionPriceCents: 0,
        castCredits: [],
        commandId,
        description: '',
        eventId,
        expectedVersion: null,
        externalUrl: null,
        imageUrl: null,
        salesChannel: 'no_advance_ticketing',
        title: 'Private draft',
      },
      dependencies,
    )

    expect(result).toEqual({
      ok: false,
      error: {
        code: 'forbidden',
        message: 'Eligible Event Producer access is required.',
        status: 403,
      },
    })
    expect(saved).toBe(false)
  })

  it('validates explicit admission choices without exposing native ticketing', () => {
    const base = {
      admissionPriceCents: 0,
      castCredits: [],
      commandId,
      description: '',
      eventId,
      expectedVersion: null,
      imageUrl: null,
      title: 'Admission Event',
    }

    expect(
      saveEventPublicContentInputSchema.safeParse({
        ...base,
        externalUrl: 'https://tickets.example/reserve',
        salesChannel: 'external',
      }).success,
    ).toBe(true)
    expect(
      saveEventPublicContentInputSchema.safeParse({
        ...base,
        externalUrl: null,
        salesChannel: 'external',
      }).success,
    ).toBe(false)
    expect(
      saveEventPublicContentInputSchema.safeParse({
        ...base,
        externalUrl: null,
        salesChannel: 'stagecom',
      }).success,
    ).toBe(false)
  })

  it('returns explicit readiness blockers for the UI', () => {
    expect(
      evaluatePublicReadiness({
        eventAtRisk: false,
        hasDraft: false,
        hasDescription: false,
        hasImage: false,
        hasOperationalApproval: false,
        hasPublicPerformance: false,
        theaterPublished: false,
      }).map((blocker) => blocker.code),
    ).toEqual([
      'theater_unpublished',
      'operational_approval_missing',
      'public_content_missing',
      'public_performance_missing',
    ])
  })

  it('removes hidden credits at the anonymous query boundary', async () => {
    const persistence: EventPublicContentPersistence = {
      authorizeEdit: async () => undefined,
      findPublishedBySlug: async () => ({
        content: {
          admissionPriceCents: 1500,
          castCredits: [
            {
              displayName: 'Visible Member',
              position: 0,
            },
          ],
          description: 'Published description',
          externalUrl: 'https://tickets.example/event',
          imageUrl: 'https://images.example/event.jpg',
          salesChannel: 'external',
          title: 'Published title',
        },
        event: { id: eventId, lifecycleStatus: 'approved', slug: 'event' },
        theater: { name: 'Theater', slug: 'theater' },
      }),
      saveDraft: async () => {
        throw new Error('must not run')
      },
    }

    const result = await getPublishedEventBySlug(
      { eventSlug: 'event', theaterSlug: 'theater' },
      { persistence },
    )

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.content.castCredits).toEqual([
        { displayName: 'Visible Member', position: 0 },
      ])
      expect(JSON.stringify(result.data)).not.toContain(castUserId)
      expect(JSON.stringify(result.data)).not.toContain('revisionNumber')
    }
  })
})
