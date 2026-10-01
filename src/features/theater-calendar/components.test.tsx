// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TheaterCalendar } from './components'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('TheaterCalendar', () => {
  it('defaults to Daybook and exposes keyboard-reachable view alternatives without making opaque occupancy a link', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-01T12:00:00Z'))
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
      screen
        .getByRole('button', { name: 'Daybook' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(
      screen.queryByRole('link', { name: /Primary Venue unavailable/ }),
    ).toBeNull()
    fireEvent.focus(
      screen.getByRole('button', {
        name: 'Details for Primary Venue unavailable',
      }),
    )
    expect(screen.getByText('Details are unavailable to you.')).toBeTruthy()
    fireEvent.click(
      screen.getByRole('button', { name: 'Next Calendar period' }),
    )
    expect(screen.getByText('No Calendar entries in this period.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Month' }))
    expect(
      screen
        .getByRole('button', { name: 'Month' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
