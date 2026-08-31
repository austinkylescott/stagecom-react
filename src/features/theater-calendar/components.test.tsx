// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TheaterCalendar } from './components'

afterEach(cleanup)

describe('TheaterCalendar', () => {
  it('defaults to Week and exposes keyboard-reachable view alternatives without making opaque occupancy a link', () => {
    render(
      <TheaterCalendar
        entries={[
          {
            detail: 'opaque',
            endsAt: '2026-09-10T20:00:00.000Z',
            event: null,
            id: 'opaque',
            label: 'Primary Venue unavailable',
            occurrenceType: null,
            startsAt: '2026-09-10T18:00:00.000Z',
          },
        ]}
        theater={{
          name: 'Lantern Theater',
          primaryVenueName: 'Primary Venue',
          slug: 'lantern',
        }}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Week' }).getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.queryByRole('link', { name: /Primary Venue unavailable/ }),
    ).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    expect(
      screen
        .getByRole('button', { name: 'Month' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
