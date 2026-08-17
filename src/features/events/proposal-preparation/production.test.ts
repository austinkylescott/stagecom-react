import { describe, expect, it } from 'vitest'

import { projectServerFunctionCall } from './production'

describe('Proposal preparation production adapter', () => {
  it('projects AppError details into presentation-safe blockers', async () => {
    const result = await projectServerFunctionCall(
      async () => ({
        error: {
          details: [
            { code: 'cast_required', message: 'Select a Cast Member.' },
            { code: 42, message: 'Malformed detail.' },
          ],
          message: 'Proposal Revision is not ready.',
        },
        ok: false as const,
      }),
      'Proposal Revision could not be submitted.',
    )

    expect(result).toEqual({
      blockers: [{ code: 'cast_required', message: 'Select a Cast Member.' }],
      ok: false,
      problem: { message: 'Proposal Revision is not ready.' },
    })
  })

  it('projects thrown transport failures without leaking the exception', async () => {
    const result = await projectServerFunctionCall(async () => {
      throw new Error('socket details')
    }, 'Proposal preparation could not be refreshed.')

    expect(result).toEqual({
      blockers: [],
      ok: false,
      problem: { message: 'Proposal preparation could not be refreshed.' },
    })
  })
})
