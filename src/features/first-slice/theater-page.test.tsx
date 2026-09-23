// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PublicTheaterPage } from './theater-page'

afterEach(cleanup)

describe('public Theater discovery', () => {
  it('links a cancelled published Event from the Theater page with explicit admission state', () => {
    render(
      <PublicTheaterPage
        mode="published"
        theater={{
          name: 'North Star Theater',
          slug: 'north-star',
          tagline: 'Live theater',
          location: {
            street: '1 Main St',
            city: 'New York',
            stateRegion: 'NY',
            postalCode: '10001',
            country: 'US',
          },
          socialLinks: [],
          upcomingEvents: [
            {
              title: 'Moonlight',
              startsAt: '2026-09-24T23:00:00Z',
              localStartsAt: '2026-09-24T19:00:00',
              timezoneName: 'America/New_York',
              locationName: 'Primary Venue',
              imageUrl: null,
              admissionSummary: '$18.00',
              cancelled: true,
              href: '/theater/north-star/moonlight',
            },
          ],
        }}
      />,
    )

    expect(
      screen.getByRole('link', { name: 'Moonlight' }).getAttribute('href'),
    ).toBe('/theater/north-star/moonlight')
    expect(screen.getByText('Cancelled Event')).toBeTruthy()
    expect(screen.getByText('Admission closed · $18.00')).toBeTruthy()
  })
})
