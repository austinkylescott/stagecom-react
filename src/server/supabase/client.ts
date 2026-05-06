import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { requireServerEnv } from '../env'

import type { Database } from '../db/database.types'

export type StagecomSupabaseClient = SupabaseClient<Database>

export function createSupabaseAnonClient(
  accessToken?: string,
): StagecomSupabaseClient {
  return createClient<Database>(
    requireServerEnv('VITE_SUPABASE_URL'),
    requireServerEnv('VITE_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: accessToken
        ? {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        : undefined,
    },
  )
}

export function createSupabaseServiceRoleClient(): StagecomSupabaseClient {
  return createClient<Database>(
    requireServerEnv('VITE_SUPABASE_URL'),
    requireServerEnv('SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
