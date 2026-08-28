import { describe, expect, it } from 'vitest'

import { createScheduleBlock } from './commands'

import type { ScheduleBlockCommandDependencies } from './commands'

const input = {
  commandId: '10000000-0000-0000-0000-000000000001',
  endsAt: '2026-10-10T21:00:00.000Z',
  privateLabel: 'Lighting maintenance',
  privateNotes: null,
  startsAt: '2026-10-10T19:00:00.000Z',
  theaterId: '20000000-0000-0000-0000-000000000002',
}

describe('Schedule Block commands', () => {
  it('does not use service-role persistence before Operator authorization', async () => {
    let created = false
    const dependencies: ScheduleBlockCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'member-1' } }),
      persistence: {
        authorizeManagement: async () => false,
        findTheaterForBlock: async () => input.theaterId,
        change: async () => { throw new Error('not used') },
        create: async () => { created = true; throw new Error('not used') },
        list: async () => { throw new Error('not used') },
      },
    }
    await expect(createScheduleBlock(input, dependencies)).resolves.toEqual({ ok: false, error: { code: 'forbidden', message: 'Current Theater Operator access is required.', status: 403 } })
    expect(created).toBe(false)
  })

  it('passes a retry-safe command id and current Operator to persistence', async () => {
    const calls: unknown[] = []
    const dependencies: ScheduleBlockCommandDependencies = {
      getCurrentUser: async () => ({ ok: true, data: { id: 'operator-1' } }),
      persistence: {
        authorizeManagement: async () => true,
        findTheaterForBlock: async () => input.theaterId,
        change: async () => { throw new Error('not used') },
        create: async (value) => { calls.push(value); return { createdAt: '2026-10-01T00:00:00Z', createdByName: '', endsAt: value.endsAt, history: [], id: 'block-1', privateLabel: value.privateLabel, privateNotes: value.privateNotes, startsAt: value.startsAt, state: 'active', version: 1 } },
        list: async () => { throw new Error('not used') },
      },
    }
    await createScheduleBlock(input, dependencies)
    expect(calls).toEqual([{ ...input, actorUserId: 'operator-1' }])
  })
})
