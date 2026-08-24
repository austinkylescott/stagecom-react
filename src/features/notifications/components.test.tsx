// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { NotificationInboxPage } from './components'

afterEach(cleanup)

describe('NotificationInboxPage', () => {
  it('separates dismissed history from current attention and only links authorized destinations', () => {
    render(
      <NotificationInboxPage
        attention={[
          {
            context: {},
            createdAt: '2026-08-24T12:00:00Z',
            description: 'The Moonlit Stage · North Star Theater',
            destination: '/app/north-star/events/moonlit-stage',
            dismissedAt: null,
            id: 'unread-alert',
            readAt: null,
            state: 'unread',
            title: 'Cast invitation',
            type: 'event.cast.invited',
          },
        ]}
        dismissed={[
          {
            context: {},
            createdAt: '2026-08-23T12:00:00Z',
            description: 'Private rehearsal · North Star Theater',
            dismissedAt: '2026-08-24T12:00:00Z',
            id: 'dismissed-alert',
            readAt: '2026-08-24T12:00:00Z',
            state: 'dismissed',
            title: 'Event cancelled',
            type: 'event.cancelled',
          },
        ]}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Needs your attention' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { name: 'Dismissed Notifications' }),
    ).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Open Event' }).getAttribute('href'),
    ).toBe('/app/north-star/events/moonlit-stage')
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeTruthy()
    expect(screen.queryAllByRole('link', { name: 'Open Event' })).toHaveLength(
      1,
    )
  })
})
