import { describe, expect, it, vi } from 'vitest'

import {
  proposeTheaterOwnershipTransfer,
  respondToTheaterOwnershipTransfer,
} from './commands'

import type { OwnershipTransferPersistence } from './persistence'

describe('Theater ownership transfer commands', () => {
  it('does not send a proposal through the service-role boundary when the actor is not the Owner', async () => {
    const persistence = stubPersistence({ canPropose: false })

    const result = await proposeTheaterOwnershipTransfer(
      {
        commandId: 'command-1',
        formerOwnerRole: 'admin',
        memberUserId: 'member-1',
        theaterId: 'theater-1',
      },
      {
        getCurrentUser: async () => ({ data: { id: 'admin-1' }, ok: true }),
        persistence,
      },
    )

    expect(result).toMatchObject({ error: { code: 'forbidden' }, ok: false })
    expect(persistence.propose).not.toHaveBeenCalled()
  })

  it('passes an acceptance and the recipient identity through the transactional boundary', async () => {
    const persistence = stubPersistence()

    const result = await respondToTheaterOwnershipTransfer(
      {
        commandId: 'command-2',
        transferId: 'transfer-1',
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
      response: 'accepted',
      transferId: 'transfer-1',
    })
  })

  it('does not send a stale transfer response through the service-role boundary', async () => {
    const persistence = stubPersistence({ canRespond: false })

    const result = await respondToTheaterOwnershipTransfer(
      {
        commandId: 'command-3',
        transferId: 'transfer-1',
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
  canPropose = true,
  canRespond = true,
}: { canPropose?: boolean; canRespond?: boolean } = {}) {
  const transfer = {
    formerOwnerRole: 'admin' as const,
    id: 'transfer-1',
    memberUserId: 'member-1',
    status: 'accepted' as const,
    theaterId: 'theater-1',
  }
  return {
    canPropose: vi.fn().mockResolvedValue(canPropose),
    canRespond: vi.fn().mockResolvedValue(canRespond),
    propose: vi.fn().mockResolvedValue(transfer),
    respond: vi.fn().mockResolvedValue(transfer),
  } satisfies OwnershipTransferPersistence
}
