import { describe, expect, it } from 'vitest'

import { dismissNotification, markNotificationRead } from './commands'

import type { NotificationCommandDependencies } from './commands'

describe('Notification commands', () => {
  it("marks only the signed-in recipient's Notification read", async () => {
    const calls: unknown[] = []
    const result = await markNotificationRead(
      { notificationId: 'notification-1' },
      dependencies(calls),
    )

    expect(result).toEqual({
      data: {
        dismissedAt: null,
        id: 'notification-1',
        readAt: '2026-08-24T12:00:00Z',
      },
      ok: true,
    })
    expect(calls).toEqual([
      {
        action: 'read',
        notificationId: 'notification-1',
        userId: 'recipient-1',
      },
    ])
  })

  it('dismisses a recipient Notification idempotently without an Event command', async () => {
    const calls: unknown[] = []
    const result = await dismissNotification(
      { notificationId: 'notification-1' },
      dependencies(calls),
    )

    expect(result).toEqual({
      data: {
        dismissedAt: '2026-08-24T12:00:00Z',
        id: 'notification-1',
        readAt: '2026-08-24T12:00:00Z',
      },
      ok: true,
    })
    expect(calls).toEqual([
      {
        action: 'dismiss',
        notificationId: 'notification-1',
        userId: 'recipient-1',
      },
    ])
  })

  it('does not mutate a Notification that is not owned by the signed-in recipient', async () => {
    const calls: unknown[] = []
    const result = await markNotificationRead(
      { notificationId: 'another-recipient-notification' },
      dependencies(calls, false),
    )

    expect(result).toMatchObject({
      error: { code: 'not_found' },
      ok: false,
    })
    expect(calls).toEqual([])
  })
})

function dependencies(
  calls: unknown[],
  canControlAttention = true,
): NotificationCommandDependencies {
  return {
    getCurrentUser: async () => ({ data: { id: 'recipient-1' }, ok: true }),
    persistence: {
      canControlAttention: async () => canControlAttention,
      setAttention: async (input) => {
        calls.push(input)
        return {
          dismissedAt:
            input.action === 'dismiss' ? '2026-08-24T12:00:00Z' : null,
          id: input.notificationId,
          readAt: '2026-08-24T12:00:00Z',
        }
      },
    },
  }
}
