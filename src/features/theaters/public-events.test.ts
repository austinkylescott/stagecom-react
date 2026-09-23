import { describe, expect, it } from 'vitest'

import { getPublishedTheaterEvents } from './public-queries'

describe('public Theater Event discovery', () => {
  it('returns only card fields for the canonical Event path with a clear cancellation state', async () => {
    const result = await getPublishedTheaterEvents(
      { theaterSlug: 'north-star' },
      {
        listPublishedEvents: async () => [
          {
            event_slug: 'moonlight',
            title: 'Moonlight',
            image_url: 'https://example.com/poster.jpg',
            starts_at: '2026-09-24T23:00:00Z',
            local_starts_at: '2026-09-24T19:00:00',
            timezone_name: 'America/New_York',
            location_name: 'Primary Venue',
            admission_price_cents: 1800,
            sales_channel: 'external',
            lifecycle_status: 'cancelled',
          },
        ],
      },
    )

    expect(result).toEqual({
      ok: true,
      data: {
        events: [
          {
            title: 'Moonlight',
            imageUrl: 'https://example.com/poster.jpg',
            startsAt: '2026-09-24T23:00:00Z',
            localStartsAt: '2026-09-24T19:00:00',
            timezoneName: 'America/New_York',
            locationName: 'Primary Venue',
            admissionSummary: '$18.00',
            cancelled: true,
            href: '/theater/north-star/moonlight',
          },
        ],
      },
    })
  })
})
