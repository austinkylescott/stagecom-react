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
      screen.getByRole('link', { name: 'Open Event: Opening Night' })
        .textContent,
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
