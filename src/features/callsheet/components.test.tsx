// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CallsheetPage } from './components'

afterEach(cleanup)

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

    const personal = screen.getByRole('region', { name: 'Your commitments' })
    const shared = screen.getByRole('region', {
      name: 'Theater needs attention',
    })
    expect(personal.textContent).toContain('Opening Night')
    expect(personal.textContent).toContain('Respond to invitation')
    expect(shared.textContent).toContain('Opening Night')
    expect(shared.textContent).toContain('Main Stage')
    expect(shared.textContent).toContain('Theater Operator')
    expect(shared.textContent).toContain('Producer requested cancellation')
    expect(
      screen
        .getByRole('link', { name: 'Decide cancellation request' })
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
      screen.getByRole('heading', { name: 'Your commitments' }),
    ).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Your Theaters' })).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Respond to invitation' })
        .getAttribute('href'),
    ).toBe('/app/north-star/events/moonlit-stage#cast-participation')
    expect(screen.getByText('Cast invitee')).toBeTruthy()
  })

  it('provides an honest empty state without hiding Theater selection', () => {
    render(<CallsheetPage commitments={[]} sharedWork={[]} theaters={[]} />)

    expect(
      screen.getByText('Nothing needs your response right now.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Create a Theater' })).toBeTruthy()
  })
})
