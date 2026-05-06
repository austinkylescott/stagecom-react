import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/server/db/database.types'

let browserClient: ReturnType<typeof createClient<Database>> | null = null

export function createSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase browser environment variables are not configured.')
  }

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
    },
  })

  return browserClient
}

export function getAuthCallbackUrl({
  inviteToken,
  next,
}: {
  inviteToken?: string
  next?: string
}) {
  const url = new URL('/auth/callback', window.location.origin)

  if (next) {
    url.searchParams.set('next', next)
  }

  if (inviteToken) {
    url.searchParams.set('inviteToken', inviteToken)
  }

  return url.toString()
}
