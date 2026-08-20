// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { CallsheetPage } from './components'

afterEach(cleanup)

describe('CallsheetPage', () => {
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
    render(<CallsheetPage commitments={[]} theaters={[]} />)

    expect(
      screen.getByText('Nothing needs your response right now.'),
    ).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Create a Theater' })).toBeTruthy()
  })
})
