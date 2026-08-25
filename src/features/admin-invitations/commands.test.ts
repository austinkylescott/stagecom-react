import { describe, expect, it, vi } from 'vitest'

import { inviteTheaterAdmin, respondToTheaterAdminInvitation } from './commands'

import type { AdminInvitationPersistence } from './persistence'

describe('Admin Invitation commands', () => {
  it('authorizes an Owner or Admin before offering authority', async () => {
    const persistence = stubPersistence({ canManage: false })

    const result = await inviteTheaterAdmin(
      {
        commandId: 'command-1',
        memberUserId: 'member-1',
        theaterId: 'theater-1',
      },
      {
        getCurrentUser: async () => ({ data: { id: 'operator-1' }, ok: true }),
        persistence,
      },
    )

    expect(result).toMatchObject({ error: { code: 'forbidden' }, ok: false })
    expect(persistence.invite).not.toHaveBeenCalled()
  })

  it('passes the recipient response to the transactional invitation boundary', async () => {
    const persistence = stubPersistence()

    const result = await respondToTheaterAdminInvitation(
      {
        commandId: 'command-2',
        invitationId: 'invitation-1',
        response: 'accepted',
      },
      {
        getCurrentUser: async () => ({ data: { id: 'member-1' }, ok: true }),
        persistence,
      },
    )

    expect(result).toMatchObject({ data: { status: 'accepted' }, ok: true })
    expect(persistence.respond).toHaveBeenCalledWith({
      actorUserId: 'member-1',
      commandId: 'command-2',
      invitationId: 'invitation-1',
      response: 'accepted',
    })
  })

  it('does not invoke the service-role response when the invitation is no longer actionable', async () => {
    const persistence = stubPersistence({ canRespond: false })

    const result = await respondToTheaterAdminInvitation(
      {
        commandId: 'command-3',
        invitationId: 'invitation-1',
        response: 'declined',
      },
      {
        getCurrentUser: async () => ({ data: { id: 'member-1' }, ok: true }),
        persistence,
      },
    )

    expect(result).toMatchObject({ error: { code: 'forbidden' }, ok: false })
    expect(persistence.respond).not.toHaveBeenCalled()
  })
})

function stubPersistence({
  canManage = true,
  canRespond = true,
}: { canManage?: boolean; canRespond?: boolean } = {}) {
  const invitation = {
    id: 'invitation-1',
    memberUserId: 'member-1',
    status: 'accepted' as const,
    theaterId: 'theater-1',
  }
  return {
    canManage: vi.fn().mockResolvedValue(canManage),
    canRespond: vi.fn().mockResolvedValue(canRespond),
    invite: vi.fn().mockResolvedValue(invitation),
    respond: vi.fn().mockResolvedValue(invitation),
  } satisfies AdminInvitationPersistence
}
