import { describe, expect, it } from 'vitest'

import { createEventHistoryReadModel } from './read-model'

describe('Event History read model', () => {
  it('keeps factual domain activity ordered and excludes activity the viewer is not authorized to read', () => {
    const history = createEventHistoryReadModel({
      actorUserId: 'cast-member',
      canViewAdminActivity: false,
      events: [
        {
          action: 'event.cancelled',
          actorDisplayName: 'Owner Person',
          actorUserId: 'owner',
          createdAt: '2026-09-03T16:00:00.000Z',
          id: 'cancelled',
          payload: { reason: 'Unsafe weather' },
          visibility: 'member_visible',
        },
        {
          action: 'event.proposal.approved',
          actorDisplayName: 'Reviewer Person',
          actorUserId: 'reviewer',
          createdAt: '2026-09-04T16:00:00.000Z',
          id: 'approved',
          payload: {},
          visibility: 'admin_only',
        },
        {
          action: 'event.staff.accepted',
          actorDisplayName: 'Owner Person',
          actorUserId: 'owner',
          createdAt: '2026-09-02T16:00:00.000Z',
          id: 'staff',
          payload: { memberUserId: 'cast-member' },
          visibility: 'self_only',
        },
      ],
    })

    expect(history.entries).toEqual([
      expect.objectContaining({
        action: 'Event cancelled',
        actor: 'Owner Person',
        detail: 'Reason: Unsafe weather',
        id: 'cancelled',
      }),
      expect.objectContaining({
        action: 'Event staff assignment accepted',
        actor: 'Owner Person',
        id: 'staff',
      }),
    ])
  })
})
