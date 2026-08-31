// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PersonalCalendar } from './components'

afterEach(cleanup)

describe('PersonalCalendar', () => {
  it('renders an agenda entry with its Theater, Event, relationship, and authorized Event path', () => {
    render(
      <PersonalCalendar
        entries={[
          {
            action: 'Open Event',
            endsAt: '2026-09-04T21:00:00Z',
            event: { slug: 'moonlit-stage', title: 'The Moonlit Stage' },
            id: 'cast:occurrence-1',
            relationship: 'Cast Member',
            startsAt: '2026-09-04T19:00:00Z',
            targetAnchor: '',
            theater: { slug: 'north-star', title: 'North Star Theater' },
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Calendar' })).toBeTruthy()
    expect(screen.getByText('North Star Theater')).toBeTruthy()
    expect(screen.getByText('Cast Member')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Open Event' }).getAttribute('href'),
    ).toBe('/app/north-star/events/moonlit-stage')
  })

  it('gives a useful empty state without implying unrelated Theater occupancy', () => {
    render(<PersonalCalendar entries={[]} />)

    expect(screen.getByText('No upcoming personal commitments.')).toBeTruthy()
    expect(
      screen.getByText(
        'Theater occupancy that does not involve you is not shown here.',
      ),
    ).toBeTruthy()
  })

  it('keeps a Call pointed at its exact Event action', () => {
    render(
      <PersonalCalendar
        entries={[
          {
            action: 'Review required Call',
            endsAt: '2026-09-04T21:00:00Z',
            event: { slug: 'moonlit-stage', title: 'The Moonlit Stage' },
            id: 'call:occurrence-1:required',
            relationship: 'Called participant · Required Call',
            startsAt: '2026-09-04T19:00:00Z',
            targetAnchor: '#occurrence-call-occurrence-1',
            theater: { slug: 'north-star', title: 'North Star Theater' },
          },
        ]}
      />,
    )

    expect(
      screen
        .getByRole('link', { name: 'Review required Call' })
        .getAttribute('href'),
    ).toBe('/app/north-star/events/moonlit-stage#occurrence-call-occurrence-1')
  })
})
