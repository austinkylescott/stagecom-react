import { createClient } from '@supabase/supabase-js'
import { loadEnv } from 'vite'
import { describe, expect, it } from 'vitest'

const env = { ...loadEnv('development', process.cwd(), ''), ...process.env }
const localDemo =
  env.STAGECOM_DEMO_MODE === 'true' &&
  /^http:\/\/(localhost|127\.0\.0\.1):/.test(env.VITE_SUPABASE_URL ?? '')

describe.skipIf(!localDemo)('persisted anonymous discovery', () => {
  it('reads published content and Performance identity while excluding unpublished revisions and Events', async () => {
    Object.assign(process.env, {
      VITE_SUPABASE_URL: env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY,
    })
    const { getPublicProgramming } = await import('./queries')
    const { getPublishedEventBySlug } = await import('../events/public-queries')
    const { getPublishedTheaterEvents } =
      await import('../theaters/public-queries')
    const discovery = await getPublicProgramming()
    expect(
      discovery.ok &&
        discovery.data.theaters.some(
          (theater) => theater.slug === 'compass-rose',
        ),
    ).toBe(true)
    const cards = await getPublishedTheaterEvents({
      theaterSlug: 'compass-rose',
    })
    expect(cards.ok && cards.data.events.map((event) => event.title)).toEqual([
      'Calendar Performance',
      'An Evening of Stories, Songs, and Unexpected Encounters from Across Our Community',
    ])
    const published = await getPublishedEventBySlug({
      theaterSlug: 'compass-rose',
      eventSlug: 'calendar-performance',
    })
    expect(published.ok).toBe(true)
    if (!published.ok) return
    expect(published.data.content.title).toBe('Calendar Performance')
    expect(published.data.content.description).not.toContain(
      'PRIVATE REVIEW COPY',
    )
    expect(published.data.content.occurrences[0]).toMatchObject({
      id: expect.stringMatching(/^[a-f0-9-]{36}$/),
      locationName: 'Compass Rose Mainstage',
    })
    const unpublished = await getPublishedEventBySlug({
      theaterSlug: 'compass-rose',
      eventSlug: 'a-midsummer-nights-dream',
    })
    expect(unpublished).toMatchObject({
      ok: false,
      error: { code: 'not_found' },
    })
    const anon = createClient(
      env.VITE_SUPABASE_URL!,
      env.VITE_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } },
    )
    for (const table of [
      'shows',
      'show_public_content_revisions',
      'show_public_occurrence_snapshots',
      'show_public_content_credits',
    ]) {
      const privateRead = await anon.from(table).select('*')
      expect(privateRead.error?.code).toBe('42501')
    }
  })
})
