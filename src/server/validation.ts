import { z } from 'zod'

import { appError, err, ok, type AppResult } from './errors'

export function validateInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): AppResult<z.infer<TSchema>> {
  const result = schema.safeParse(input)

  if (!result.success) {
    return err(
      appError(
        'validation_error',
        'The submitted data is invalid.',
        z.flattenError(result.error),
      ),
    )
  }

  return ok(result.data)
}

export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const result = validateInput(schema, input)

  if (!result.ok) {
    throw result.error
  }

  return result.data
}
