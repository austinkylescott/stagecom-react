import { describe, expect, it } from 'vitest'

import { appError, err, ok } from './errors'

describe('AppError contract', () => {
  it('maps standard error codes to safe status values', () => {
    expect(appError('forbidden', 'No access')).toEqual({
      code: 'forbidden',
      message: 'No access',
      status: 403,
    })
  })

  it('wraps success and failure results consistently', () => {
    expect(ok({ id: 'theater_1' })).toEqual({
      ok: true,
      data: { id: 'theater_1' },
    })

    expect(err(appError('not_found', 'Missing'))).toEqual({
      ok: false,
      error: {
        code: 'not_found',
        message: 'Missing',
        status: 404,
      },
    })
  })
})
