// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CallsheetPage } from './components'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CallsheetPage', () => {
  it('shows the gathering, obligation and zoned time before opening a personal Call', () => {
    render(
      <CallsheetPage
        commitments={[
          {
            id: 'occurrence-call:rehearsal',
            kind: 'occurrence_call',
            action: 'Review call',
            actionableAt: '2030-11-03T05:30:00Z',
            relationship: 'Cast Member',
            call: { requirement: 'optional', occurrenceType: 'rehearsal' },
            event: { slug: 'opening', title: 'Opening Night' },
            theater: { slug: 'north', title: 'North Stage' },
            targetAnchor: '#occurrence-call-rehearsal',
          },
        ]}
        sharedWork={[]}
        theaters={[]}
      />,
    )
    const calls = screen.getByRole('region', { name: 'Confirmed Calls' })
    expect(calls.textContent).toContain('Rehearsal · Optional Call')
    expect(calls.textContent).toContain('UTC')
    expect(calls.querySelector('time')?.dateTime).toBe('2030-11-03T05:30:00Z')
    expect(calls.querySelector('a')?.getAttribute('href')).toBe(
      '/app/north/events/opening#occurrence-call-rehearsal',
    )
  })

  it('keeps a personal invitation and shared decision for the same Event in separate phone-ready sections', () => {
    render(
      <CallsheetPage
        commitments={[
          {
            action: 'Respond to invitation',
            actionableAt: null,
            event: { slug: 'opening-night', title: 'Opening Night' },
            id: 'cast-invitation:opening-night',
            kind: 'cast_invitation',
            relationship: 'Cast invitee',
            targetAnchor: '#cast-participation',
            theater: { slug: 'main-stage', title: 'Main Stage' },
          },
        ]}
        sharedWork={[
          {
            id: 'cancellation:opening-night',
            kind: 'cancellation',
            label: 'Decide cancellation request',
            relationship: 'Theater Operator',
            priorityReason: 'Producer requested cancellation',
            href: '/app/main-stage/events/opening-night#overview',
            theaterName: 'Main Stage',
            eventTitle: 'Opening Night',
            deadlineAt: null,
          },
        ]}
        theaters={[]}
      />,
    )

    const personal = screen.getByRole('region', { name: 'Response needed' })
    const shared = screen.getByRole('region', {
      name: 'Shared decisions',
    })
    expect(personal.textContent).toContain('Opening Night')
    expect(personal.textContent).toContain('Respond to invitation')
    expect(shared.textContent).toContain('Opening Night')
    expect(shared.textContent).toContain('Main Stage')
    expect(shared.textContent).toContain('Theater Operator')
    expect(shared.textContent).toContain('Producer requested cancellation')
    expect(
      screen
        .getByRole('link', {
          name: 'Decide cancellation request: Opening Night',
        })
        .getAttribute('href'),
    ).toBe('/app/main-stage/events/opening-night#overview')
  })

  it('separates actionable commitments from Theater selection and exposes each action', () => {
    render(
      <CallsheetPage
        commitments={[
          {
            action: 'Respond to invitation',
            actionableAt: '2026-08-25T19:00:00Z',
            event: { slug: 'moonlit-stage', title: 'The Moonlit Stage' },
            id: 'cast-invitation:event-1',
            kind: 'cast_invitation',
            relationship: 'Cast invitee',
            targetAnchor: '#cast-participation',
            theater: { slug: 'north-star', title: 'North Star Theater' },
          },
        ]}
        sharedWork={[]}
        theaters={[
          {
            id: 'theater-1',
            isDefault: true,
            name: 'North Star Theater',
            slug: 'north-star',
            status: 'published',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Response needed' }),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Your Theaters' })).toBeNull()
    expect(
      screen
        .getByRole('link', { name: 'Respond to invitation' })
        .getAttribute('href'),
    ).toBe('/app/north-star/events/moonlit-stage#cast-participation')
    expect(screen.getByText('Cast invitee')).toBeTruthy()
  })

  it('provides an honest empty state without hiding Theater selection', () => {
    render(<CallsheetPage commitments={[]} sharedWork={[]} theaters={[]} />)

    expect(screen.queryByRole('region', { name: 'Response needed' })).toBeNull()
    expect(
      screen.queryByRole('region', { name: 'Shared decisions' }),
    ).toBeNull()
    expect(screen.queryByRole('region', { name: 'Confirmed Calls' })).toBeNull()
    expect(screen.queryByText('You’re up to date')).toBeNull()
    expect(
      screen.queryByText('No upcoming published Events in your Theaters.'),
    ).toBeNull()
    expect(screen.getByRole('link', { name: 'Create a Theater' })).toBeTruthy()
  })
  it('distinguishes same-title destinations by Theater, lifecycle and authorized date', () => {
    const events = [
      {
        id: 'one',
        title: 'Opening Night',
        theaterName: 'North Stage',
        lifecycle: 'approved',
        nextDate: '2030-10-23T23:00:00Z',
        scheduleVisible: true,
        href: '/app/north/events/one',
      },
      {
        id: 'two',
        title: 'Opening Night',
        theaterName: 'South Stage',
        lifecycle: 'draft',
        scheduleVisible: false,
        href: '/app/south/events/two',
      },
      {
        id: 'three',
        title: 'Opening Night',
        theaterName: 'North Stage',
        lifecycle: 'approved',
        nextDate: '2030-10-24T23:00:00Z',
        scheduleVisible: true,
        href: '/app/north/events/three',
      },
      {
        id: 'four',
        title: 'Opening Night',
        theaterName: 'North Stage',
        lifecycle: 'draft',
        scheduleVisible: false,
        href: '/app/north/events/four',
      },
    ]
    render(
      <CallsheetPage
        commitments={[]}
        sharedWork={[]}
        theaters={[]}
        events={events.slice(0, 3)}
        discovery={events.slice(3)}
      />,
    )
    const destinations = [
      [
        'Opening Night North Stage · approved Next Event date: Oct 23, 2030, 11:00 PM UTC',
        '/app/north/events/one',
      ],
      [
        'Opening Night South Stage · draft Schedule not shared',
        '/app/south/events/two',
      ],
      [
        'Opening Night North Stage · approved Next Event date: Oct 24, 2030, 11:00 PM UTC',
        '/app/north/events/three',
      ],
      [
        'Opening Night North Stage · draft Schedule not shared',
        '/app/north/events/four',
      ],
    ]
    for (const [name, href] of destinations) {
      const link = screen.getByRole('link', { name })
      expect(link.getAttribute('href')).toBe(href)
      link.focus()
      expect(document.activeElement).toBe(link)
    }
  })

  it('distinguishes otherwise matching summaries without leaking withheld dates or route IDs', () => {
    render(
      <CallsheetPage
        commitments={[]}
        sharedWork={[]}
        theaters={[]}
        events={[
          {
            id: 'opaque-a',
            title: 'Opening Night',
            theaterName: 'North Stage',
            lifecycle: 'draft',
            scheduleVisible: false,
            nextDate: '2030-10-23T23:00:00Z',
            href: '/app/north/events/opaque-a',
          },
          {
            id: 'opaque-b',
            title: 'Opening Night',
            theaterName: 'North Stage',
            lifecycle: 'draft',
            scheduleVisible: false,
            nextDate: '2031-10-23T23:00:00Z',
            href: '/app/north/events/opaque-b',
          },
        ]}
      />,
    )
    for (const [index, route] of ['opaque-a', 'opaque-b'].entries()) {
      const link = screen.getByRole('link', {
        name: `Opening Night North Stage · draft · Matching Event ${index + 1} of 2 Schedule not shared`,
      })
      expect(link.getAttribute('href')).toBe(`/app/north/events/${route}`)
    }
    expect(screen.queryByText(/2030|2031|opaque-/)).toBeNull()
  })

  it('explains workspace relevance and reveals Cast names on avatar activation', async () => {
    render(
      <CallsheetPage
        commitments={[]}
        sharedWork={[]}
        theaters={[]}
        events={[
          {
            id: 'event',
            title: 'Opening Night',
            href: '/app/stage/events/opening',
            theaterName: 'Main Stage',
            relationships: ['Theater Operator'],
            lifecycle: 'draft',
            nextDate: '2099-10-23T23:00:00Z',
            scheduleVisible: true,
            castMembers: [
              { userId: 'morgan', displayName: 'Morgan', avatarUrl: null },
              { userId: 'casey', displayName: 'Casey', avatarUrl: null },
            ],
          },
        ]}
      />,
    )
    expect(
      screen.getByRole('region', { name: 'Your Event workspaces' }).textContent,
    ).toContain('Events you participate in, lead, or oversee.')
    expect(
      screen.getByRole('link', {
        name: /Opening Night Main Stage · Theater Operator · draft Next Event date:/,
      }).textContent,
    ).toContain('Main Stage · Theater Operator · draft')
    expect(screen.getByRole('button', { name: 'Morgan' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Casey' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Morgan' }))
    expect((await screen.findByRole('tooltip')).textContent).toBe('Morgan')
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe(
      '2099-10-23T23:00:00Z',
    )
    expect(
      screen.queryByRole('region', { name: 'More Events to explore' }),
    ).toBeNull()
    expect(screen.queryByRole('region', { name: 'Confirmed Calls' })).toBeNull()
  })
})
