// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { PublishedEventPage } from './components'

afterEach(cleanup)

it('presents the complete poster with original access and separate published details', () => {
  render(
    <PublishedEventPage
      content={{
        title: 'Moonlight',
        description: 'Published copy',
        imageUrl: 'https://example.com/poster.jpg',
        admissionPriceCents: 1800,
        admissionCallToAction: {
          href: 'https://tickets.example.com',
          label: 'Get tickets',
        },
        castCredits: [],
        occurrences: [
          {
            durationMinutes: 90,
            startsAt: '2026-10-20T23:00:00Z',
            localStartsAt: '2026-10-20T19:00:00',
            timezoneName: 'America/New_York',
            utcOffsetMinutes: -240,
            locationName: 'Mainstage',
          },
        ],
      }}
      event={{ lifecycleStatus: 'approved' }}
      theater={{ name: 'North Star', slug: 'north-star' }}
    />,
  )
  expect(
    screen
      .getByRole('link', { name: 'Open original poster' })
      .getAttribute('href'),
  ).toBe('https://example.com/poster.jpg')
  expect(
    screen.getByRole('img', { name: 'Moonlight poster' }).className,
  ).toContain('object-contain')
  expect(screen.getByText('Published presentation')).toBeTruthy()
  expect(
    screen.getByText('Mainstage · 90 minutes · America/New_York'),
  ).toBeTruthy()
  expect(screen.getByText('$18.00')).toBeTruthy()
  expect(screen.queryByRole('heading', { name: 'Cast' })).toBeNull()
})

it('keeps the published Performance identity when entering the authorized current plan', () => {
  render(
    <PublishedEventPage
      content={{
        title: 'Moonlight',
        description: 'Published copy',
        imageUrl: null,
        admissionPriceCents: 0,
        admissionCallToAction: { href: null, label: 'No advance ticketing' },
        castCredits: [],
        occurrences: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            durationMinutes: 90,
            startsAt: '2026-10-20T23:00:00Z',
            localStartsAt: '2026-10-20T19:00:00',
            timezoneName: 'America/New_York',
            utcOffsetMinutes: -240,
            locationName: 'Mainstage',
          },
        ],
      }}
      event={{ lifecycleStatus: 'approved', slug: 'moonlight' }}
      theater={{ name: 'North Star', slug: 'north-star' }}
    />,
  )
  expect(
    screen
      .getByRole('link', { name: 'Open this Performance in the private Event' })
      .getAttribute('href'),
  ).toBe(
    '/app/north-star/events/moonlight#occurrence-11111111-1111-4111-8111-111111111111',
  )
  expect(screen.getByText('Poster unavailable')).toBeTruthy()
  expect(screen.getByText('No advance ticketing')).toBeTruthy()
})
