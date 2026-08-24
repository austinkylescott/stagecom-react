import { describe, expect, it } from 'vitest'

import { createNotificationInboxReadModel } from './read-model'

describe('Notification inbox read model', () => {
  it('keeps dismissed Notifications out of attention while preserving their distinct history', () => {
    const inbox = createNotificationInboxReadModel({
      notifications: [
        {
          context: {
            destination: '/app/north-star/events/moonlit-stage',
            eventTitle: 'The Moonlit Stage',
            theaterName: 'North Star Theater',
          },
          createdAt: '2026-08-24T12:00:00Z',
          dismissedAt: null,
          id: 'unread',
          readAt: null,
          type: 'event.cast.invited',
        },
        {
          context: {
            eventTitle: 'The Moonlit Stage',
            theaterName: 'North Star Theater',
          },
          createdAt: '2026-08-24T11:00:00Z',
          dismissedAt: '2026-08-24T13:00:00Z',
          id: 'dismissed',
          readAt: '2026-08-24T12:30:00Z',
          type: 'event.cancelled',
        },
      ],
    })

    expect(inbox.attention).toEqual([
      expect.objectContaining({
        destination: '/app/north-star/events/moonlit-stage',
        id: 'unread',
        state: 'unread',
        title: 'Cast invitation',
      }),
    ])
    expect(inbox.dismissed).toEqual([
      expect.objectContaining({
        id: 'dismissed',
        state: 'dismissed',
        title: 'Event cancelled',
      }),
    ])
  })

  it('does not invent a destination when the recipient no longer has authorized Event access', () => {
    const inbox = createNotificationInboxReadModel({
      notifications: [
        {
          context: {
            eventTitle: 'Private rehearsal',
            theaterName: 'North Star Theater',
          },
          createdAt: '2026-08-24T12:00:00Z',
          dismissedAt: null,
          id: 'no-destination',
          readAt: '2026-08-24T12:05:00Z',
          type: 'event.operational_health.at_risk',
        },
      ],
    })

    expect(inbox.attention[0]).toMatchObject({
      description: 'Private rehearsal · North Star Theater',
      state: 'read',
      title: 'Event at risk',
    })
    expect(inbox.attention[0].destination).toBeUndefined()
  })
})
