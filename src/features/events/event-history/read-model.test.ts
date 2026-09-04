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

  it('shows a safe automatic-completion failure only to Theater Operators', () => {
    const history = createEventHistoryReadModel({
      actorUserId: 'operator',
      canViewAdminActivity: true,
      events: [
        {
          action: 'event.completion.failed',
          actorDisplayName: null,
          actorUserId: null,
          createdAt: '2026-10-11T01:01:00.000Z',
          id: 'completion-failure',
          payload: {
            errorMessage: 'The Event changed while completion was evaluated.',
            evaluatedAt: '2026-10-11T01:01:00.000Z',
            finalConfirmedSlotEndsAt: '2026-10-11T01:00:00.000Z',
          },
          visibility: 'admin_only',
        },
      ],
    })

    expect(history.entries).toEqual([
      expect.objectContaining({
        action: 'Automatic completion failed',
        actor: 'Stagecom system',
        detail:
          'Automatic completion failed safely: The Event changed while completion was evaluated. Final Confirmed Slot ended: 2026-10-11T01:00:00.000Z. Evaluated: 2026-10-11T01:01:00.000Z.',
        id: 'completion-failure',
      }),
    ])
  })
})
