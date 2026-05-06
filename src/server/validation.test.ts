import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { validateInput } from './validation'

describe('validateInput', () => {
  const schema = z.object({
    slug: z.string().min(2),
  })

  it('returns parsed data for valid input', () => {
    expect(validateInput(schema, { slug: 'mainstage' })).toEqual({
      ok: true,
      data: { slug: 'mainstage' },
    })
  })

  it('returns a serializable validation error for invalid input', () => {
    const result = validateInput(schema, { slug: '' })

    expect(result.ok).toBe(false)

    if (!result.ok) {
      expect(result.error.code).toBe('validation_error')
      expect(result.error.status).toBe(400)
      expect(result.error.details).toEqual({
        formErrors: [],
        fieldErrors: {
          slug: ['Too small: expected string to have >=2 characters'],
        },
      })
    }
  })
})
