import { describe, expect, it } from 'vitest'

import { serverEnvSchema } from './env'

describe('serverEnvSchema', () => {
  it('treats blank optional env vars as unset', () => {
    expect(
      serverEnvSchema.parse({
        SUPABASE_DB_URL: '',
        SUPABASE_PROJECT_ID: '',
        SUPABASE_SERVICE_ROLE_KEY: '',
        VITE_APP_URL: '',
        VITE_SUPABASE_ANON_KEY: '',
        VITE_SUPABASE_URL: '',
      }),
    ).toEqual({
      SUPABASE_DB_URL: undefined,
      SUPABASE_PROJECT_ID: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
      VITE_APP_URL: undefined,
      VITE_SUPABASE_ANON_KEY: undefined,
      VITE_SUPABASE_URL: undefined,
    })
  })

  it('rejects malformed Supabase URLs', () => {
    expect(() =>
      serverEnvSchema.parse({
        SUPABASE_DB_URL: 'not-a-url',
        VITE_SUPABASE_URL: 'not-a-url',
      }),
    ).toThrow()
  })
})
